import React, { useState, useEffect } from "react";
import {
  Text,
  Image,
  View,
  Pressable,
  ActivityIndicator,
  LogBox,
} from "react-native";
import { useNavigation } from "@react-navigation/core";
import { DataStore } from "@aws-amplify/datastore";
import { ChatRoomUser, User, Message, ChatRoom } from "../../src/models";
import styles from "./styles";
import { Auth } from "@aws-amplify/auth";
import moment from "moment";

export default function ChatRoomItem({ chatroom }) {
  // console.log(chatroom);
  LogBox.ignoreAllLogs();
  // const [users, setUsers] = useState<User[]>([]); // all users in this chatroom
  const [user, setUser] = useState<User | null>(null); // the display user
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = (await DataStore.query(ChatRoomUser))

        .filter((chatRoomUser) => {
          if (chatRoomUser.chatRoom != undefined) return chatRoomUser;
        })
        .filter((chatRoomUser) => chatRoomUser.chatRoom.id === chatroom.id)
        .map((chatRoomUser) => chatRoomUser.user);

      // setUsers(fetchedUsers);
      // console.log("user", fetchedUsers);

      const authUser = await Auth.currentAuthenticatedUser();
      setUser(
        fetchedUsers.find((user) => user.id !== authUser.attributes.sub) || null
      );
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (chatroom != undefined) {
      DataStore.query(Message, chatroom.chatRoomLastMessageId).then(
        setLastMessage
      );
    }
  }, []);

  const onPress = () => {
    if (chatroom != undefined)
      navigation.navigate("ChatRoom", { id: chatroom.id });
  };

  if (!user) {
    return;
  }

  const time = moment(lastMessage?.createdAt).from(moment());

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image
        source={{ uri: chatroom.imageUri || user.imageUri }}
        style={styles.image}
      />

      {!!chatroom && !!chatroom.newMessages && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{chatroom.newMessages}</Text>
        </View>
      )}

      <View style={styles.rightContainer}>
        <View style={styles.row}>
          <Text style={styles.name}>{chatroom.name || user.name}</Text>
          <Text style={styles.text}>{time}</Text>
        </View>
        <Text numberOfLines={1} style={styles.text}>
          {lastMessage?.content}
        </Text>
      </View>
    </Pressable>
  );
}
