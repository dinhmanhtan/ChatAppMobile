import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { DataStore } from "@aws-amplify/datastore";
import { User } from "../../src/models";
import { Auth, Storage } from "aws-amplify";
import { S3Image } from "aws-amplify-react-native";
import { useWindowDimensions } from "react-native";
import AudioPlayer from "../AudioPlayer";
import { Ionicons } from "@expo/vector-icons";
import { Message as MessageModel } from "../../src/models";
import MessageReply from "../MessageReply";
import DocumentMsg from "../DocumentMsg";
import { Avatar } from "react-native-paper";
import ImageView from "react-native-image-viewing";
import { useNavigation } from "@react-navigation/core";

const blue = "#3777f0";
const grey = "lightgrey";

const Message = (props) => {
  const {
    setAsMessageReply,
    message: propMessage,
    firstInChain,
    userChat,
    firstInMessages,
    isMe,
    images,
    indexOfImages,
  } = props;
  // console.log(propMessage);
  const navigation = useNavigation();
  const [visible, setIsVisible] = useState(false);

  const [message, setMessage] = useState<MessageModel>(propMessage);
  const [repliedTo, setRepliedTo] = useState<MessageModel | undefined>(
    undefined
  );

  const [user, setUser] = useState<User | undefined>();
  // const [isMe, setIsMe] = useState<boolean | null>(null);
  const { width } = useWindowDimensions();
  const [soundURI, setSoundURI] = useState<any>(null);
  const [documentURI, setDocumentURI] = useState<any>(null);

  useEffect(() => {
    DataStore.query(User, message.userID).then(setUser);
  }, []);

  useEffect(() => {
    setMessage(propMessage);
  }, [propMessage]);

  useEffect(() => {
    if (message?.replyToMessageID) {
      DataStore.query(MessageModel, message.replyToMessageID).then(
        setRepliedTo
      );
    }
  }, [message]);

  useEffect(() => {
    const subscription = DataStore.observe(MessageModel, message.id).subscribe(
      (msg) => {
        if (msg.model === MessageModel && msg.opType === "UPDATE") {
          setMessage((message) => ({ ...message, ...msg.element }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setAsRead();
  }, [isMe, message]);

  useEffect(() => {
    if (message.audio) {
      Storage.get(message.audio).then(setSoundURI);
    } else if (message.document) {
      //Storage.get(message.document).then(setDocumentURI);
      setDocumentURI(message.document);
    }
  }, [message]);

  // useEffect(() => {
  //   const checkIfMe = async () => {
  //     if (!user) {
  //       return;
  //     }
  //     const authUser = await Auth.currentAuthenticatedUser();
  //     setIsMe(user.id === authUser.attributes.sub);
  //   };
  //   checkIfMe();
  //   console.log(isMe);
  // }, [user]);

  const setAsRead = async () => {
    if (isMe === false && message.status !== "READ") {
      await DataStore.save(
        MessageModel.copyOf(message, (updated) => {
          updated.status = "READ";
        })
      );
    }
  };
  const location = message.location
    ? `${message.location.latitude},${message.location.longitude}`
    : null;
  const url = Platform.select({
    ios: `maps:${location}`,
    android: `geo:${location}?center=${location}&q=${location}&z=16`,
  });

  if (!user) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      {message.image && visible && (
        <ImageView
          images={images}
          imageIndex={indexOfImages}
          visible={visible}
          onRequestClose={() => setIsVisible(false)}
        />
      )}
      {firstInChain && userChat && (
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}
        >
          <Avatar.Image
            source={{
              uri: userChat.imageUri,
            }}
            size={33}
            style={{ marginLeft: 10 }}
          />
          <Text style={{ marginLeft: 10 }}>{userChat.name}</Text>
        </View>
      )}
      <Pressable
        onLongPress={setAsMessageReply}
        style={[
          styles.container,
          isMe ? styles.rightContainer : styles.leftContainer,
          {
            width: soundURI ? "75%" : "auto",
            marginTop: firstInChain ? 10 : 0,
            padding: message.image ? 0 : 10,
          },
        ]}
      >
        {repliedTo && <MessageReply message={repliedTo} />}
        <View style={styles.row}>
          {message.image && (
            <Pressable
              style={{ marginBottom: message.content ? 10 : 0 }}
              onPress={() => setIsVisible(true)}
            >
              <S3Image
                imgKey={message.image}
                style={{
                  width: width * 0.65,
                  aspectRatio: 4 / 3,
                  borderRadius: 10,
                }}
                resizeMode="contain"
              />
            </Pressable>
          )}
          {message.location && (
            <Pressable
              style={{
                alignItems: "center",
                margin: 5,
                flexDirection: "column",
              }}
              onPress={() => Linking.openURL(url)}
            >
              <Ionicons
                name="ios-location"
                size={24}
                color="red"
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 40,
                  backgroundColor: "white",
                  margin: 10,
                  borderRadius: 10,
                }}
              />
              <Text style={{ color: isMe ? "black" : "white" }}>
                Click to View Location
              </Text>
            </Pressable>
          )}
          {soundURI && <AudioPlayer soundURI={soundURI} />}
          {documentURI && <DocumentMsg documentURI={documentURI} />}
          {!!message.content && (
            <Text style={{ color: isMe ? "black" : "white" }}>
              {message.content}
            </Text>
          )}

          {isMe &&
            !!message.status &&
            message.status !== "SENT" &&
            firstInMessages && (
              <Ionicons
                name={
                  message.status === "DELIVERED"
                    ? "checkmark"
                    : "checkmark-done"
                }
                size={16}
                color="gray"
                style={{ marginHorizontal: 5 }}
              />
            )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 10,
    borderRadius: 10,
    maxWidth: "75%",
    // flexDirection: "row",
    // alignItems: "flex-end",
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  leftContainer: {
    backgroundColor: blue,
    marginLeft: 25,
    marginRight: "auto",
    alignItems: "flex-end",
  },
  messageReply: {
    backgroundColor: "gray",
    padding: 5,
    borderRadius: 5,
  },
  rightContainer: {
    backgroundColor: grey,
    marginLeft: "auto",
    marginRight: 10,
  },
});

export default memo(Message);
