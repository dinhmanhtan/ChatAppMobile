import React, { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet, Text, View, Dimensions, Pressable } from "react-native";
import * as Location from "expo-location";
import { Button } from "react-native-paper";
import { Auth } from "aws-amplify";
import { ChatRoom, Message, Location as LocationMap } from "../src/models";
import { useNavigation } from "@react-navigation/core";
import { DataStore } from "@aws-amplify/datastore";

export default function LocationScreen({ route }) {
  console.log("props", route);
  const navigation = useNavigation();
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const sendMessage = async () => {
    // send message
    const location = new LocationMap({
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    });
    const navigateToChatroom = (user) => {
      navigation.navigate("ChatRoom", { id: route.params.chatroomID });
    };
    const user = await Auth.currentAuthenticatedUser();

    const newMessage = await DataStore.save(
      new Message({
        userID: user.attributes.sub,
        chatroomID: route.params.chatroomID,
        replyToMessageID: route.params.replyToMessageID,
        location,
        status: "SENT",
      })
    ).then(navigateToChatroom);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        showsMyLocationButton={true}
        showsUserLocation={true}
        followsUserLocation={true}
        showsCompass={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        onPress={(event) => console.log(event.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={mapRegion}
          title="Marker"
          onPress={() => console.log(mapRegion)}
        />
      </MapView>
      <Button style={styles.yourLocation} onPress={sendMessage}>
        Share your Location
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    //justifyContent: "center",
  },
  map: {
    width: Dimensions.get("window").width,
    height: 0.7 * Dimensions.get("window").height,
  },
  yourLocation: {
    marginTop: 15,
    padding: 7,
    backgroundColor: "#e28743",
  },
});
