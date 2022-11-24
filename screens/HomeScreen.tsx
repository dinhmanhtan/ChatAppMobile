import React, { useState, useEffect } from "react";

import {
  Text,
  Image,
  Pressable,
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Auth, DataStore } from "aws-amplify";
import { ChatRoom, ChatRoomUser, Message } from "../src/models";
import ChatRoomItem from "../components/ChatRoomItem";

export default function TabOneScreen() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [tempChatRoom, setTempChatRoom] = useState<ChatRoom>(null);
  const [observe, setObserve] = useState<Boolean>(false);
  const [userAuth, setUserAuth] = useState(null);

  const fetchChatRooms = async () => {
    const userData = await Auth.currentAuthenticatedUser();
    const fa = (item) => {
      setChatRooms(
        item
          .filter(
            (chatRoomUser) => chatRoomUser.user.id === userData.attributes.sub
          )
          .map((chatRoomUser) => chatRoomUser.chatRoom)
      );
      setObserve(true);
      setUserAuth(userData);
    };

    await DataStore.query(ChatRoomUser).then(fa);

    // setChatRooms(chatRooms);
  };
  useEffect(() => {
    fetchChatRooms();
    // console.log("1", chatRooms);
  }, []);

  useEffect(() => {
    if (userAuth) {
      const subscription = DataStore.observe(ChatRoomUser).subscribe(
        (chatroomUser) => {
          // console.log(chatroomUser);
          // console.log(userAuth);
          if (
            chatroomUser.model === ChatRoomUser &&
            chatroomUser.opType === "INSERT" &&
            chatroomUser.element.user.id === userAuth?.attributes.sub
          ) {
            console.log("yes", chatroomUser.element.chatRoom);
            setChatRooms((existingChatRoom) => [
              chatroomUser.element.chatRoom,
              ...existingChatRoom,
            ]);
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [userAuth]);

  // useEffect(() => {
  //   if (userAuth) {
  //     const subscription = DataStore.observe(ChatRoom).subscribe((chatroom) => {
  //       // console.log(chatroomUser);

  //       if (
  //         chatroom.model === ChatRoom &&
  //         chatroom.opType === "UPDATE" &&
  //         chatroom.element.chatRoomLastMessageId
  //       ) {
  //         console.log("chatrooms", chatRooms);
  //         for (let i = 0; i < chatRooms.length; i++) {
  //           if (
  //             chatRooms[i].id === chatroom.element.id &&
  //             chatRooms[i].chatRoomLastMessageId !=
  //               chatroom.element.chatRoomLastMessageId
  //           ) {
  //             console.log("change");
  //             const rooms = chatRooms.filter(
  //               (room) => room.id != chatRooms[i].id
  //             );
  //             const finalRooms = [chatroom.element, ...rooms];
  //             console.log("rooms", rooms);
  //             console.log("final", finalRooms);
  //             setChatRooms(finalRooms);
  //           }
  //         }
  //       }
  //     });

  //     return () => subscription.unsubscribe();
  //   }
  // }, [userAuth]);

  if (!userAuth) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.page}>
      <FlatList
        data={chatRooms}
        renderItem={({ item }) => <ChatRoomItem chatroom={item} />}
        showsVerticalScrollIndicator={false}
      />
      {/* <Pressable
        onPress={logOut}
        style={{
          backgroundColor: "red",
          height: 50,
          margin: 10,
          borderRadius: 50,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>Logout</Text>
      </Pressable> */}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    flex: 1,
  },
});
