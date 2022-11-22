import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import {
  SimpleLineIcons,
  Feather,
  MaterialCommunityIcons,
  AntDesign,
  Ionicons,
} from "@expo/vector-icons";
import { DataStore } from "@aws-amplify/datastore";
import { ChatRoom, Message } from "../../src/models";
import { Auth, Storage } from "aws-amplify";
import EmojiModal from "react-native-emoji-modal";
import * as ImagePicker from "expo-image-picker";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { Audio, AVPlaybackStatus } from "expo-av";
import { stat } from "fs";
import AudioPlayer from "../AudioPlayer";
import MessageComponent from "../Message";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/core";

const MessageInput = ({ chatRoom, messageReplyTo, removeMessageReplyTo }) => {
  const [message, setMessage] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [soundURI, setSoundURI] = useState<string | null>(null);
  const [documentURI, setDocumentURI] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const libraryResponse =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const photoResponse = await ImagePicker.requestCameraPermissionsAsync();
        await Audio.requestPermissionsAsync();

        if (
          libraryResponse.status !== "granted" ||
          photoResponse.status !== "granted"
        ) {
          alert("Sorry, we need camera roll permissions to make this work!");
        }
      }
    })();
  }, []);

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({});
    console.log(result);
    setDocumentURI(result.uri);
  };

  const sendMessage = async () => {
    // send message
    const user = await Auth.currentAuthenticatedUser();
    const newMessage = await DataStore.save(
      new Message({
        content: message,
        userID: user.attributes.sub,
        chatroomID: chatRoom.id,
        replyToMessageID: messageReplyTo?.id,
      })
    );

    updateLastMessage(newMessage);
    resetFields();
  };

  const updateLastMessage = async (newMessage) => {
    DataStore.save(
      ChatRoom.copyOf(chatRoom, (updatedChatRoom) => {
        updatedChatRoom.LastMessage = newMessage;
      })
    );
  };

  const onPlusClicked = () => {
    console.warn("On plus clicked");
  };

  const onPress = () => {
    if (image) {
      console.log("message");
      sendImage();
    } else if (soundURI) {
      sendAudio();
    } else if (message) {
      sendMessage();
    } else if (documentURI) {
      sendDocument();
    } else {
      onPlusClicked();
    }
  };

  const resetFields = () => {
    setMessage("");
    setIsEmojiPickerOpen(false);
    setImage(null);
    setProgress(0);
    setSoundURI(null);
    setDocumentURI(null);
    removeMessageReplyTo();
  };

  // Image picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.cancelled) {
      setImage(result.uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [4, 3],
    });

    if (!result.cancelled) {
      setImage(result.uri);
    }
  };

  const progressCallback = (progress) => {
    setProgress(progress.loaded / progress.total);
  };

  const sendImage = async () => {
    if (!image) {
      return;
    }
    const blob = await getBlob(image);
    const { key } = await Storage.put(`${uuidv4()}.png`, blob, {
      progressCallback,
    });

    // send message
    const user = await Auth.currentAuthenticatedUser();
    const newMessage = await DataStore.save(
      new Message({
        content: message,
        image: key,
        userID: user.attributes.sub,
        chatroomID: chatRoom.id,
        replyToMessageID: messageReplyTo?.id,
      })
    );

    updateLastMessage(newMessage);

    resetFields();
  };

  const getBlob = async (uri: string) => {
    const respone = await fetch(uri);
    const blob = await respone.blob();
    return blob;
  };

  async function startRecording() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    console.log("Stopping recording..");
    if (!recording) {
      return;
    }

    setRecording(null);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);
    if (!uri) {
      return;
    }
    setSoundURI(uri);
  }

  const sendAudio = async () => {
    if (!soundURI) {
      return;
    }
    const uriParts = soundURI.split(".");
    const extenstion = uriParts[uriParts.length - 1];
    const blob = await getBlob(soundURI);
    const { key } = await Storage.put(`${uuidv4()}.${extenstion}`, blob, {
      progressCallback,
    });

    // send message
    const user = await Auth.currentAuthenticatedUser();
    const newMessage = await DataStore.save(
      new Message({
        content: message,
        audio: key,
        userID: user.attributes.sub,
        chatroomID: chatRoom.id,
        status: "SENT",
        replyToMessageID: messageReplyTo?.id,
      })
    );

    updateLastMessage(newMessage);

    resetFields();
  };

  const sendDocument = async () => {
    if (!documentURI) {
      return;
    }
    const uriParts = documentURI.split(".");
    const extenstion = uriParts[uriParts.length - 1];
    const blob = await getBlob(documentURI);
    const { key } = await Storage.put(`${uuidv4()}.${extenstion}`, blob, {
      progressCallback,
    });

    // send message
    const user = await Auth.currentAuthenticatedUser();
    const newMessage = await DataStore.save(
      new Message({
        content: message,
        document: key,
        userID: user.attributes.sub,
        chatroomID: chatRoom.id,
        status: "SENT",
        replyToMessageID: messageReplyTo?.id,
      })
    );

    updateLastMessage(newMessage);

    resetFields();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { height: isEmojiPickerOpen ? "52%" : "auto" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      {messageReplyTo && (
        <View
          style={{
            backgroundColor: "#f2f2f2",
            padding: 5,
            flexDirection: "row",
            alignSelf: "stretch",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            {/* <Text>Reply to:</Text> */}
            <MessageComponent message={messageReplyTo} />
          </View>
          <Pressable onPress={() => removeMessageReplyTo()}>
            <AntDesign
              name="close"
              size={24}
              color="black"
              style={{ margin: 5 }}
            />
          </Pressable>
        </View>
      )}

      {(image || documentURI) && (
        <View style={styles.sendImageContainer}>
          <Image
            source={{
              uri: image
                ? image
                : "https://auth7074d48482fa400bb2388f6e074c33a7105513-staging.s3.ap-southeast-1.amazonaws.com/public/document.png?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEO%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0xIkcwRQIgbWHQ6GuhW5%2BYhFML9YLboHqcJE29IT9Hrg%2Blz4hqi4ICIQDzpCIHOB8M%2FEA%2Bb5cq6BgMxezdYKqEQll%2F8YgN364E8CrtAgjo%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDU0Mjk3MjA1NTc0MyIMB%2FjREqZsdvZRyS33KsECRmbagdWoj3rR05NTyIi%2FqSFTp99fsZ9vJTIpztPMX3a417U52vO%2FDEwyvL%2FxaOq3UAhVJS%2FlvECj4RLghGF6%2F3LK9ih%2BRHuEfMLdlKo95DgdoBn8UPGiexkGf%2FaAOWUX0qNAxMZ1xvvKF1LOpwLUUzvZYVvrKZqwF2%2BXc37JlLOdBa8hAVtelk1ojradNxuQ8c2L%2BFOWy%2FKlca43mgZ9%2Bt%2Bx8uVn0wrSbhlOzmSG9xI%2FgDSqXolcfTpN9qS%2FmYaB5kVrVMGHNUi6vznjBZVAmQoWCTuvVJANHe0rbpSnv%2BCSj4VDgaBGD%2FPaCXWhOf4XpgP499Sjyqv%2BdWTh0q0dH1jNucR6c9a%2FEU30syBcJTYbg%2BCmQ1VVp9pRbftFSBrhGrRykNDMpz55pm1MIU6DogKu9E6gn9D5MbfJa55qtSFLMPXxy5sGOrMC4%2BfLO1gxznka8d9122ZbTfdViKndcc80LzwBESQ3mPpWkwLkJchAH13T6jWkseNc4ZZ6NTyXHff1x2vAzNhVIw6zgyCGrS8bpqLDDUD6O51MprBq7%2BrY17XN13BA7R5sixKEXj3KEZwq5hgqHU6z%2Fw9hTMI803eVhdN%2Bg6C0UKyYC63EhRBzcHk8s4WFmFvF9sj78b4MA97cAhDRLibrHMHkuHl9k%2BQLhkPFVjrBoi6XWxoMHO0j4gUdDrfMx3bXeMN75OSRoF516lE3hfXhBDH8%2BydlllJuf4QoKL0%2FpRHKKA%2BZfI7%2F51V8t1sZPzg6puIHzWSCNNl4JMuxiTKOe4ENgjpd9M2fEUQ1RGhE1tWhFUHY%2FG0ezyslwbF7AEmstMmhsMdLDbn50rSjdae1Z5M0fA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20221115T092642Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAX425ICC7WVVIR23N%2F20221115%2Fap-southeast-1%2Fs3%2Faws4_request&X-Amz-Signature=386f26ea51fdbf21a3a8842b0784e9161442d40495d771fc5a8f40e3a1911410",
            }}
            style={{ width: 100, height: 100, borderRadius: 10 }}
          />

          <View
            style={{
              flex: 1,
              justifyContent: "flex-start",
              alignSelf: "flex-end",
            }}
          >
            <View
              style={{
                height: 5,
                borderRadius: 5,
                backgroundColor: "#3777f0",
                width: `${progress * 100}%`,
              }}
            />
          </View>

          <Pressable
            onPress={() => {
              setImage(null);
              setDocumentURI(null);
            }}
          >
            <AntDesign
              name="close"
              size={24}
              color="black"
              style={{ margin: 5 }}
            />
          </Pressable>
        </View>
      )}

      {isEmojiPickerOpen && (
        <EmojiModal
          onEmojiSelected={(emoji) =>
            setMessage((currentMessage) => currentMessage + emoji)
          }
          columns={10}
          emojiSize={30}
        />
      )}
      {soundURI && <AudioPlayer soundURI={soundURI} />}

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Pressable
            onPress={() =>
              setIsEmojiPickerOpen((currentValue) => !currentValue)
            }
          >
            <SimpleLineIcons
              name="emotsmile"
              size={24}
              color="#595959"
              style={styles.icon}
            />
          </Pressable>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Message..."
            onPressIn={() => setIsEmojiPickerOpen(false)}
          />
          <Pressable
            onPress={() =>
              navigation.navigate("LocationScreen", {
                chatroomID: chatRoom.id,
                replyToMessageID: messageReplyTo?.id,
              })
            }
          >
            <Ionicons name="ios-location-outline" size={24} color="black" />
          </Pressable>
          <Pressable onPress={pickDocument}>
            <Ionicons name="document-attach-outline" size={24} color="black" />
          </Pressable>
          <Pressable onPress={pickImage}>
            <Feather
              name="image"
              size={24}
              color="#595959"
              style={styles.icon}
            />
          </Pressable>

          <Pressable onPress={takePhoto}>
            <Feather
              name="camera"
              size={24}
              color="#595959"
              style={styles.icon}
            />
          </Pressable>
          <Pressable onPressIn={startRecording} onPressOut={stopRecording}>
            <MaterialCommunityIcons
              name={recording ? "microphone" : "microphone-outline"}
              size={24}
              color={recording ? "red" : "#595959"}
              style={styles.icon}
            />
          </Pressable>
        </View>

        <Pressable onPress={onPress} style={styles.buttonContainer}>
          {message || image || soundURI || documentURI ? (
            <Ionicons name="send" size={18} color="white" />
          ) : (
            <AntDesign name="plus" size={24} color="white" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    padding: 10,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
  },
  inputContainer: {
    backgroundColor: "#f2f2f2",
    flex: 1,
    marginRight: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#dedede",
    alignItems: "center",
    flexDirection: "row",
    padding: 5,
  },
  input: {
    flex: 1,
    marginHorizontal: 5,
  },
  icon: {
    marginHorizontal: 5,
  },
  buttonContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#3777f0",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 35,
  },

  sendImageContainer: {
    flexDirection: "row",
    marginVertical: 10,
    alignSelf: "stretch",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "lightgray",
    borderRadius: 10,
  },
});

export default MessageInput;
