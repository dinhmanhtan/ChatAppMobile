import React, { useState, useEffect } from "react";

import {
  Text,
  Image,
  Pressable,
  View,
  StyleSheet,
  FlatList,
} from "react-native";
import { Auth, DataStore } from "aws-amplify";
import { ChatRoom, ChatRoomUser } from "../src/models";
import ChatRoomItem from "../components/ChatRoomItem";

export default function TabOneScreen() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  const fetchChatRooms = async () => {
    const userData = await Auth.currentAuthenticatedUser();

    const chatRooms = (await DataStore.query(ChatRoomUser))
      .filter(
        (chatRoomUser) => chatRoomUser.user.id === userData.attributes.sub
      )
      .map((chatRoomUser) => chatRoomUser.chatRoom);

    setChatRooms(chatRooms);
  };
  useEffect(() => {
    fetchChatRooms();
    console.log("1", chatRooms);
  }, []);

  useEffect(() => {
    const subscription = DataStore.observe(ChatRoom).subscribe((chatroom) => {
      // console.log(chatroom.model, chatroom.opType, chatroom.element);
      if (chatroom.model === ChatRoom && chatroom.opType === "INSERT") {
        setChatRooms((existingChatRoom) => [
          chatroom.element,
          ...existingChatRoom,
        ]);
        // fetchChatRooms();
        console.log("2", chatRooms);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
