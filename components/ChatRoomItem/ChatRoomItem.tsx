import React, { useState, useEffect } from "react";
import {
  Text,
  Image,
  View,
  Pressable,
  ActivityIndicator,
  LogBox,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/core";
import { DataStore } from "@aws-amplify/datastore";
import { ChatRoomUser, User, Message, ChatRoom } from "../../src/models";
import { Auth } from "@aws-amplify/auth";
import moment from "moment";
import { FontAwesome5 } from "@expo/vector-icons";

export default function ChatRoomItem({ chatroom }) {
  // console.log(chatroom);
  LogBox.ignoreAllLogs();
  // const [users, setUsers] = useState<User[]>([]); // all users in this chatroom
  const [users, setUsers] = useState<User[]>([]); // the display user
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [nameUser, setNameUser] = useState<String>("");
  const [authUser, setAuthUser] = useState(null);
  const [urlIcon, setUrlIcon] = useState<String>("");
  const [quote, setQuote] = useState<string>("");

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
      setUsers(
        fetchedUsers.filter((user) => user.id !== authUser.attributes.sub)
      );
      setAuthUser(authUser);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (chatroom != undefined && chatroom.chatRoomLastMessageId) {
      DataStore.query(Message, chatroom.chatRoomLastMessageId).then(
        setLastMessage
      );
    }
  }, []);
  useEffect(() => {
    if (lastMessage && users && authUser) {
      // console.log(authUser.username);
      if (lastMessage.userID === authUser.attributes.sub) {
        setNameUser("You : ");
      } else {
        for (let i = 0; i < users.length; i++) {
          if (lastMessage.userID === users[i].id) {
            setNameUser(`${users[i].name} : `);
            break;
          }
        }
      }
      if (lastMessage.image) {
        setQuote("Image");
        setUrlIcon(require("../../assets/images/image-icon.png"));
      } else if (lastMessage.audio) {
        setQuote("Audio");
        setUrlIcon(require("../../assets/images/audio-icon.png"));
      } else if (lastMessage.location) {
        setQuote("Location");
        setUrlIcon(require("../../assets/images/map-icon.png"));
      } else if (lastMessage.document) {
        setQuote("Document");
        setUrlIcon(require("../../assets/images/document-icon.jpg"));
      }
    }
  }, [lastMessage]);

  const onPress = () => {
    if (chatroom != undefined) {
      // console.log(chatroom);
      navigation.navigate("ChatRoom", { id: chatroom.id });
    }
  };

  // if (!user) {
  //   return;
  // }

  const time = lastMessage
    ? moment(lastMessage?.createdAt).from(moment())
    : null;
  // console.log(lastMessage, time);

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image
        source={{ uri: chatroom.imageUri || users[0]?.imageUri }}
        style={styles.image}
      />

      {!!chatroom && !!chatroom.newMessages && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{chatroom.newMessages}</Text>
        </View>
      )}

      <View style={styles.rightContainer}>
        <View style={styles.row}>
          <Text style={styles.name}>{chatroom.name || users[0]?.name}</Text>
          <Text style={styles.text}>{time}</Text>
        </View>
        {!lastMessage?.image &&
        !lastMessage?.audio &&
        !lastMessage?.location &&
        !lastMessage?.document ? (
          <Text numberOfLines={1} style={styles.text}>
            {nameUser}
            {lastMessage?.content}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "stretch" }}>
            <Text style={styles.text}>{nameUser}</Text>
            {/* <FontAwesome5 name="map-marked-alt" size={24} color="black" /> */}
            <Image source={urlIcon} style={styles.icon} />
            <Text style={styles.text}>{quote}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 10,
  },
  image: {
    height: 50,
    width: 50,
    borderRadius: 30,
    marginRight: 10,
  },
  badgeContainer: {
    backgroundColor: "#3777f0",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 45,
    top: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
  },
  rightContainer: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 3,
  },
  text: {
    color: "grey",
  },
  icon: {
    height: 17,
    width: 17,
    marginHorizontal: 6,
  },
});
