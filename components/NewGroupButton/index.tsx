import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Text, TouchableRipple } from "react-native-paper";

const NewGroupButton = ({ onPress }) => {
  return (
    <TouchableRipple onPress={onPress}>
      <View style={styles.menuItem}>
        <FontAwesome name="group" size={26} color="#4f4f4f" />
        <Text style={styles.menuItemText}>New Group</Text>
      </View>
    </TouchableRipple>
  );
};

export default NewGroupButton;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  menuItem: {
    flexDirection: "row",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuItemText: {
    color: "black",
    marginLeft: 20,
    fontWeight: "bold",
    fontSize: 16,
    lineHeight: 26,
  },
});
