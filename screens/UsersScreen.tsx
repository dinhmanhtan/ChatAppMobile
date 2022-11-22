import React, { useState, useEffect } from "react";

import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Pressable,
  SafeAreaView,
  Alert,
} from "react-native";
import UserItem from "../components/UserItem";
import NewGroupButton from "../components/NewGroupButton";
import { useNavigation } from "@react-navigation/native";
import { Auth, DataStore } from "aws-amplify";
import { ChatRoom, User, ChatRoomUser } from "../src/models";
export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [dbUser, setDBUser] = useState<User | undefined>(undefined);
  const [chatRoomUsers, setChatRoomUsers] = useState<ChatRoomUser[]>([]);

  const fetchChatRooms = async () => {
    const chatRooms = await DataStore.query(ChatRoomUser);
    // .filter(
    //   (chatRoomUser) => chatRoomUser.user.id === userData.attributes.sub
    // )
    // .map((chatRoomUser) => chatRoomUser.chatRoom);

    setChatRoomUsers(chatRooms);
  };
  useEffect(() => {
    fetchChatRooms();
  }, []);
  //console.log("1", chatRoomUsers);

  const navigation1 = useNavigation();

  useEffect(() => {
    const fetchDBUser = async () => {
      const authUser = await Auth.currentAuthenticatedUser();
      const dbUser = await DataStore.query(User, authUser.attributes.sub);
      setDBUser(dbUser);
    };
    fetchDBUser();
    // console.log("b");
  }, []);

  const fetchUsers = async () => {
    const fetchedUsers = (await DataStore.query(User)).filter(
      (user) => user.id !== dbUser?.id
    );

    setUsers(fetchedUsers);
  };
  useEffect(() => {
    if (dbUser != undefined) {
      fetchUsers();
    }
    // console.log("a");
  }, [dbUser]);

  const addUserToChatRoom = async (user, chatroom) => {
    DataStore.save(new ChatRoomUser({ user, chatRoom: chatroom }));
  };

  const createChatRoom = async (users) => {
    // TODO if there is already a chat room between these 2 users
    // then redirect to the existing chat room
    // otherwise, create a new chatroom with these users.

    // connect authenticated user with the chat room
    if (!isNewGroup && users.length == 1) {
      const chatRoom1s = chatRoomUsers
        .filter((chatRoomUser) => chatRoomUser.user.id == dbUser?.id)
        .map((chatRoomUser) => chatRoomUser.chatRoom.id);

      const chatRoom2s = chatRoomUsers
        .filter((chatRoomUser) => chatRoomUser.user.id == users[0]?.id)
        .filter((chatRoomUser) => chatRoomUser.chatRoom.isGroup == false)
        .map((chatRoomUser) => chatRoomUser.chatRoom.id);

      for (let i = 0; i < chatRoom1s.length; i++) {
        const index = chatRoom2s.indexOf(chatRoom1s[i]);

        if (index > -1) {
          console.log("yes", chatRoom1s[i]);
          console.log("user[0]", users[0]);
          navigation1.navigate("ChatRoom", { id: chatRoom1s[i] });
          return;
        }
      }
    }

    if (!dbUser) {
      Alert.alert("There was an error creating the group");
      return;
    }

    // Create a chat room
    const newChatRoomData = {
      newMessages: 0,
      Admin: dbUser,
      isGroup: false,
    };

    if (users.length > 1) {
      newChatRoomData.name = "New group";
      newChatRoomData.imageUri =
        "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/group.jpeg";
      newChatRoomData.isGroup = true;
    }
    const newChatRoom = await DataStore.save(new ChatRoom(newChatRoomData));
    // console.log(newChatRoom);

    if (dbUser) {
      await addUserToChatRoom(dbUser, newChatRoom);
    }

    // connect users user with the chat room
    await Promise.all(
      users.map((user) => addUserToChatRoom(user, newChatRoom))
    );

    navigation1.navigate("ChatRoom", { id: newChatRoom.id });
  };

  const isUserSelected = (user) => {
    return selectedUsers.some((selectedUser) => selectedUser.id === user.id);
  };

  const onUserPress = async (user) => {
    if (isNewGroup) {
      if (isUserSelected(user)) {
        // remove it from selected
        setSelectedUsers(
          selectedUsers.filter((selectedUser) => selectedUser.id !== user.id)
        );
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    } else {
      await createChatRoom([user]);
    }
  };

  const saveGroup = async () => {
    await createChatRoom(selectedUsers);
  };

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <UserItem
            user={item}
            onPress={() => onUserPress(item)}
            isSelected={isNewGroup ? isUserSelected(item) : undefined}
          />
        )}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <NewGroupButton
            onPress={() => {
              const u = users.filter((user) => user.id !== dbUser?.id);
              setUsers(u);
              setIsNewGroup(!isNewGroup);
            }}
          />
        )}
      />

      {isNewGroup && (
        <Pressable style={styles.button} onPress={saveGroup}>
          <Text style={styles.buttonText}>
            Save group ({selectedUsers.length})
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    flex: 1,
  },
  button: {
    backgroundColor: "#3777f0",
    marginHorizontal: 10,
    padding: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
