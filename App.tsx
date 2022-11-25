import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import useCachedResources from "./hooks/useCachedResources";
import useColorScheme from "./hooks/useColorScheme";
import Navigation from "./navigation";
import { DataStore, Hub } from "aws-amplify";
import { Amplify } from "@aws-amplify/core";
import Auth from "@aws-amplify/auth";
import awsmobile from "./src/aws-exports";
import { withAuthenticator } from "aws-amplify-react-native";
import { Message, User } from "./src/models";
import { AmplifyTheme } from "aws-amplify-react-native";

// import moment from "moment";

Amplify.configure(awsmobile);

function App() {
  const isLoadingComplete = useCachedResources();
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(undefined);

  const fetchUser = async () => {
    const userData = await Auth.currentAuthenticatedUser();
    const user = await DataStore.query(User, userData.attributes.sub);
    const users = await DataStore.query(User);
    // console.log("userdata", userData);
    // console.log("users", users);
    // console.log("user", user);
    if (user) {
      setUserData(userData);
      setUser(user);
    }
  };

  useEffect(() => {
    // Create listener
    // console.log("registeriong listener");
    const listener = Hub.listen("datastore", async (hubData) => {
      const { event, data } = hubData.payload;
      //console.log(data);

      if (
        event === "outboxMutationProcessed" &&
        data.model === Message &&
        !["DELIVERED", "READ"].includes(data.element.status)
      ) {
        // set the message status to delivered
        DataStore.save(
          Message.copyOf(data.element, (updated) => {
            updated.status = "DELIVERED";
          })
        );
      }
    });

    // Remove listener
    return () => listener();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const subscription = DataStore.observe(User, user.id).subscribe((msg) => {
      if (msg.model === User && msg.opType === "UPDATE") {
        setUser(msg.element);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    fetchUser();
  }, []);

  // const updateName = async (name) => {
  //   if (!user) {
  //     return;
  //   }
  //   const response = await DataStore.save(
  //     User.copyOf(user, (updated) => {
  //       updated.name = name;
  //     })
  //   );
  // };

  useEffect(() => {
    const interval = setInterval(async () => {
      await updateLastOnline();
    }, 40000 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const updateLastOnline = async () => {
    if (!user) {
      return;
    }

    const response = await DataStore.save(
      User.copyOf(user, (updated) => {
        updated.lastOnlineAt = +new Date();
        updated.name = userData.username;
        updated.imageUri =
          user.imageUri != null
            ? user.imageUri
            : "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/1.jpg";
      })
    );
    setUser(response);
    console.log(response);
  };

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <Navigation colorScheme={colorScheme} />
        <StatusBar />
      </SafeAreaProvider>
    );
  }
}

const customTheme = {
  ...AmplifyTheme,
  button: {
    ...AmplifyTheme.button,
    backgroundColor: "blue",
  },
  sectionFooterLink: {
    ...AmplifyTheme.sectionFooterLink,
    color: "blue",
  },
  sectionFooterLinkDisabled: {
    ...AmplifyTheme.sectionFooterLinkDisabled,
    color: "#34a1eb",
  },
  buttonDisabled: {
    ...AmplifyTheme.buttonDisabled,
    backgroundColor: "#34a1eb",
  },
};
export default withAuthenticator(App, { theme: customTheme });
