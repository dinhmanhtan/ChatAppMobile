import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import AudioPlayer from "../AudioPlayer";
import { Message as MessageModel } from "../../src/models";
import DocumentMsg from "../DocumentMsg";

const blue = "#3777f0";
const grey = "lightgrey";

const MessageReply = (props) => {
  const { message: propMessage, nameUser } = props;

  const [message, setMessage] = useState<MessageModel>(propMessage);

  const [user, setUser] = useState<User | undefined>();
  const [isMe, setIsMe] = useState<boolean | null>(null);
  const [soundURI, setSoundURI] = useState<any>(null);
  const [urlToMap, setUrlToMap] = useState<any>(null);
  const [documentURI, setDocumentURI] = useState<any>(null);

  const { width } = useWindowDimensions();

  useEffect(() => {
    DataStore.query(User, message.userID).then(setUser);
  }, []);

  useEffect(() => {
    setMessage(propMessage);
  }, [propMessage]);

  useEffect(() => {
    if (message.audio) {
      Storage.get(message.audio).then(setSoundURI);
    } else if (message.location) {
      const location = message.location
        ? `${message.location.latitude},${message.location.longitude}`
        : null;
      const url = Platform.select({
        ios: `maps:${location}`,
        android: `geo:${location}?center=${location}&q=${location}&z=16`,
      });
      setUrlToMap(url);
    } else if (message.document) {
      //Storage.get(message.document).then(setDocumentURI);
      setDocumentURI(message.document);
    }
  }, [message]);

  useEffect(() => {
    const checkIfMe = async () => {
      if (!user) {
        return;
      }
      const authUser = await Auth.currentAuthenticatedUser();
      setIsMe(user.id === authUser.attributes.sub);
    };
    checkIfMe();
  }, [user]);

  if (!user) {
    return <ActivityIndicator />;
  }
  // console.log(nameUser);
  return (
    <View
      style={[
        styles.container,
        isMe ? styles.rightContainer : styles.leftContainer,
        { width: soundURI ? "75%" : "auto" },
      ]}
    >
      <Text style={{ fontWeight: "bold", marginBottom: 10 }}>{nameUser}</Text>
      <View style={styles.row}>
        {message.image && (
          <View style={{ marginBottom: message.content ? 10 : 0 }}>
            <S3Image
              imgKey={message.image}
              style={{ width: width * 0.2, aspectRatio: 4 / 3 }}
              resizeMode="contain"
            />
          </View>
        )}
        {soundURI && <AudioPlayer soundURI={soundURI} width={100} />}
        {message.location && (
          <Pressable
            style={{
              alignItems: "center",
              margin: 5,
              flexDirection: "column",
            }}
            onPress={() => Linking.openURL(urlToMap)}
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
        {documentURI && <DocumentMsg documentURI={documentURI} />}
        {!!message.content && (
          <Text style={{ color: "black" }}>{message.content}</Text>
        )}

        {/* {isMe && !!message.status && message.status !== "SENT" && (
          <Ionicons
            name={
              message.status === "DELIVERED" ? "checkmark" : "checkmark-done"
            }
            size={16}
            color="gray"
            style={{ marginHorizontal: 5 }}
          />
        )} */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 10,
    borderRadius: 10,
    // maxWidth: "75%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageReply: {
    backgroundColor: "gray",
    padding: 5,
    borderRadius: 5,
  },
  leftContainer: {
    backgroundColor: "#759ee0",
    marginLeft: 10,
    marginRight: "auto",
    color: "black",
  },
  rightContainer: {
    backgroundColor: "#759ee0",
    marginLeft: "auto",
    marginRight: 10,
    alignItems: "flex-start",
    borderRadius: 5,
  },
});

export default MessageReply;
