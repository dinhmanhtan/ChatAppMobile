import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
  Alert,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import { Storage } from "aws-amplify";
import { View } from "../Themed";

const DocumentMsg = ({ documentURI, onLongPress }) => {
  const [url, setUrl] = useState<String>("");
  const [type, setType] = useState<String>("");
  const [read, setRead] = useState<Boolean>(false);
  useEffect(() => {
    const uriParts = documentURI.split(".");
    setType(uriParts[uriParts.length - 1]);
    Storage.get(documentURI).then(setUrl);
  }, []);

  const handlePress = useCallback(async () => {
    // Checking if the link is supported for links with custom URL scheme.
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      // Opening the link with some app, if the URL scheme is "http" the web link should be opened
      // by some browser in the mobile
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`);
    }
  }, [url]);

  return (
    <Pressable
      style={styles.Container}
      onPress={handlePress}
      onLongPress={onLongPress}
    >
      <Image
        source={{
          uri: "https://auth7074d48482fa400bb2388f6e074c33a7105513-staging.s3.ap-southeast-1.amazonaws.com/public/document-icon.jpg",
        }}
        style={{ width: 60, height: 60, borderRadius: 10 }}
      />

      <Text style={styles.filename}>{documentURI}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  Container: {
    marginVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    // alignItems: "center",
    alignSelf: "stretch",
    // borderWidth: 1,
    // borderColor: "lightgray",
    borderRadius: 10,
  },
  filename: {
    marginLeft: 20,
    flexShrink: 1,
    width: 70,
  },
});

export default DocumentMsg;
