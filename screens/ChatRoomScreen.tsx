import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/core";
import { DataStore } from "@aws-amplify/datastore";
import {
  ChatRoom,
  Message as MessageModel,
  ChatRoomUser,
  User,
} from "../src/models";
import Message from "../components/Message";
import MessageInput from "../components/MessageInput";
import { SortDirection, Auth, Storage } from "aws-amplify";
import { Modal } from "react-native-paper";
import { AntDesign } from "@expo/vector-icons";

export default function ChatRoomScreen({ navigation }) {
  const [messages, setMessages] = useState<MessageModel[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messageReplyTo, setMessageReplyTo] = useState<MessageModel | null>(
    null
  );
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [userDB, setUserDB] = useState<any>();
  const [container, setContainer] = useState<any>([]);
  const [urlImageMessages, setUrlImageMessages] = useState<any>([]);
  const [hasGetUrlImages, setHasGetUrlImages] = useState(false);
  const route = useRoute();
  useEffect(() => {
    const { routes } = navigation.getState();
    // console.log(routes);
    const filteredRoutes = routes.filter((route) => {
      return route.name == "Home" || route.name == "ChatRoom";
    });
    // console.log(filteredRoutes);
    navigation.reset({
      index: filteredRoutes.length - 1,
      routes: filteredRoutes,
    });
  }, []);

  useEffect(() => {
    fetchChatRoom();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [chatRoom]);

  useEffect(() => {
    const subscription = DataStore.observe(MessageModel).subscribe((msg) => {
      // console.log(msg.model, msg.opType, msg.element);
      // console.log(msg);

      if (msg.model === MessageModel && msg.opType === "INSERT") {
        setMessages((existingMessage) => [...existingMessage, msg.element]);
        if (msg.element.image) {
          getUrlImageMessage(msg.element.image);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchChatRoom = async () => {
    if (!route.params?.id) {
      console.warn("No chatroom id provided");
      return;
    }
    const chatRoom = await DataStore.query(ChatRoom, route.params.id);
    if (!chatRoom) {
      console.error("Couldn't find a chat room with this id");
    } else {
      setChatRoom(chatRoom);
    }

    const authUser = await Auth.currentAuthenticatedUser();
    setUserDB(authUser);
    const fetchedUsers = (await DataStore.query(ChatRoomUser))
      .filter((chatRoomUser) => chatRoomUser.chatRoom != undefined)
      .filter((chatRoomUser) => chatRoomUser.chatRoom.id === route.params?.id)
      .filter((chatRoomUser) => chatRoomUser.user.id != authUser.attributes.sub)
      .map((chatRoomUser) => chatRoomUser.user);
    // console.log(fetchedUsers);
    setOtherUsers(fetchedUsers);
  };

  const fetchMessages = async () => {
    if (!chatRoom) {
      return;
    }
    const fetchedMessages = await DataStore.query(
      MessageModel,
      (message) => message.chatroomID("eq", chatRoom?.id),
      {
        sort: (message) => message.createdAt(SortDirection.DESCENDING),
      }
    );
    // console.log(fetchedMessages);
    setMessages(fetchedMessages.reverse());
  };

  const getUrlImageMessage = async (key) => {
    const signedURL = await Storage.get(key);

    if (urlImageMessages.indexOf(signedURL) == -1) {
      const item = { uri: signedURL };
      setUrlImageMessages((existingUrl) => [...existingUrl, item]);
    }
  };
  useEffect(() => {
    if (messages.length > 0 && !hasGetUrlImages) {
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].image) {
          getUrlImageMessage(messages[i].image);
        }
      }
      setHasGetUrlImages(true);
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && userDB && otherUsers.length > 0) {
      let arr = [];
      let arr1 = [];
      var item;
      let first = true;
      var userTemp = null;
      let indexOfImages = 0;
      for (let i = 0; i < messages.length; i++) {
        // message and other attributes for group chat
        item = {
          item: messages[i],
          firstInChain: false,
          user: null,
          firstInMessages: false,
          isMe: false,
          indexOfImages: messages[i].image ? indexOfImages : null,
        };
        if (userDB.attributes.sub != messages[i].userID) {
          var index;
          for (let j = 0; j < otherUsers.length; j++) {
            if (messages[i].userID == otherUsers[j].id) {
              index = j;

              break;
            }
          }
          if (
            (chatRoom?.isGroup && i == 0) ||
            userTemp?.id != messages[i].userID
          ) {
            item["firstInChain"] = true;
            item["user"] = otherUsers[index];
          }
          if (userTemp != otherUsers[index]) userTemp = otherUsers[index];

          if (
            !chatRoom?.isGroup &&
            userDB.attributes.sub != messages[i].userID &&
            (i == 0 || messages[i - 1].userID == userDB.attributes.sub)
          ) {
            item["firstInChain"] = true;
            item["user"] = userTemp;
          }
        }

        // message and other attribute for  non-group chat

        if (
          first &&
          userDB.attributes.sub == messages[i].userID &&
          messages[i].status === "READ"
        ) {
          first = false;
          item["firstInMessages"] = true;
        }
        if (userDB.attributes.sub == messages[i].userID) item["isMe"] = true;
        if (messages[i].image) indexOfImages += 1;

        // get URL if message is image
        arr[messages.length - 1 - i] = item;
        arr1[i] = item;
      }
      // console.log(arr);

      setContainer(arr1);
    }
  }, [messages, otherUsers]);

  if (!chatRoom) {
    return <ActivityIndicator />;
  }

  return (
    <SafeAreaView style={styles.page}>
      <FlatList
        data={container}
        renderItem={({ item }) => (
          <Message
            message={item.item}
            setAsMessageReply={() => setMessageReplyTo(item.item)}
            firstInChain={item.firstInChain}
            userChat={item.user}
            firstInMessages={item.firstInMessages}
            isMe={item.isMe}
            indexOfImages={item.indexOfImages}
            images={urlImageMessages}
          />
        )}
        // inverted
      />
      <Modal
        visible={false}
        style={{
          backgroundColor: "red",
          height: 150,

          display: "flex",
          flexDirection: "row",
        }}
      >
        <AntDesign name="like2" size={24} color="black" />
        <AntDesign name="like2" size={24} color="black" />
        <AntDesign name="like2" size={24} color="black" />
        <AntDesign name="like2" size={24} color="black" />
      </Modal>
      <MessageInput
        chatRoom={chatRoom}
        messageReplyTo={messageReplyTo}
        removeMessageReplyTo={() => setMessageReplyTo(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    flex: 1,
  },
});
