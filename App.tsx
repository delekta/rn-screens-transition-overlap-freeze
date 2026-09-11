import React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  Animated,
  Button,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

// enableFreeze(); // does not matter for repro

/**
 * Required to freeze:
 * 1. iOS native-stack modal present (`presentation: 'modal'`).
 * 2. A second native-stack inside a plain View, sibling of the root stack.
 * 3. That second stack unmounts during the present.
 *
 * Delay unmount 1s (switch) to confirm the present finishing first avoids the freeze.
 */
const DELAYED_UNMOUNT_MS = 1000;

type RootStackParamList = {
  Home: undefined;
  Modal: undefined;
};

type ModalStackParamList = {
  ModalHome: undefined;
};

type NestedStackParamList = {
  NestedHome: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const ModalStack = createNativeStackNavigator<ModalStackParamList>();
const NestedStack = createNativeStackNavigator<NestedStackParamList>();

const UnmountNestedContext = React.createContext<{
  unmountNested: () => void;
  delayUnmountMs: number;
}>({
  unmountNested: () => {},
  delayUnmountMs: 0,
});

function HeartbeatOverlay() {
  const {top} = useSafeAreaInsets();
  const spin = React.useRef(new Animated.Value(0)).current;
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    const id = setInterval(() => setTick(value => value + 1), 250);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View pointerEvents="none" style={[styles.heartbeat, {top: top + 8}]}>
      <Animated.View style={[styles.heartbeatBox, {transform: [{rotate}]}]} />
      <Text style={styles.heartbeatTick}>{tick}</Text>
    </View>
  );
}

function HomeScreen({
  openNested,
  openModal,
  delayUnmount,
  setDelayUnmount,
}: {
  openNested: () => void;
  openModal: () => void;
  delayUnmount: boolean;
  setDelayUnmount: (value: boolean) => void;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.copy}>
        Open the nested native-stack in the view, then present the modal. The
        modal unmounts that stack on mount. If the magenta tick stops, the main
        thread is dead.
      </Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Unmount nested stack 1s later</Text>
        <Switch value={delayUnmount} onValueChange={setDelayUnmount} />
      </View>
      <View style={styles.buttonGap}>
        <Button title="1. Show nested native-stack" onPress={openNested} />
      </View>
      <Pressable style={styles.action} onPress={openModal}>
        <Text style={styles.actionText}>2. Present modal</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function ModalHomeScreen() {
  const {unmountNested, delayUnmountMs} = React.useContext(UnmountNestedContext);

  React.useEffect(() => {
    if (delayUnmountMs > 0) {
      const timeout = setTimeout(unmountNested, delayUnmountMs);
      return () => clearTimeout(timeout);
    }
    unmountNested();
  }, [delayUnmountMs, unmountNested]);

  return (
    <SafeAreaView style={[styles.screen, styles.modal]} edges={['bottom']}>
      <Text style={styles.title}>Modal</Text>
      <Text style={styles.copy}>
        Mount unmounted the sibling native-stack. If you can read this, it did
        not freeze.
      </Text>
    </SafeAreaView>
  );
}

function ModalNavigator() {
  return (
    <ModalStack.Navigator screenOptions={{headerShown: true, title: 'Modal'}}>
      <ModalStack.Screen name="ModalHome" component={ModalHomeScreen} />
    </ModalStack.Navigator>
  );
}

function NestedHomeScreen() {
  return (
    <View style={styles.nestedScreen}>
      <Text style={styles.title}>Nested native-stack</Text>
      <Text style={styles.copy}>Blank screen in a view is enough. Leave this open and present the modal.</Text>
    </View>
  );
}

function NestedStackSheet() {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.plainSheet}>
        <NavigationContainer>
          <NestedStack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: styles.sheetBackground,
            }}>
            <NestedStack.Screen name="NestedHome" component={NestedHomeScreen} />
          </NestedStack.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
}

function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [nestedVisible, setNestedVisible] = React.useState(false);
  const [delayUnmount, setDelayUnmount] = React.useState(false);

  const unmountNested = React.useCallback(() => {
    setNestedVisible(false);
  }, []);

  const unmountContext = React.useMemo(
    () => ({
      unmountNested,
      delayUnmountMs: delayUnmount ? DELAYED_UNMOUNT_MS : 0,
    }),
    [delayUnmount, unmountNested],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <UnmountNestedContext.Provider value={unmountContext}>
          <NavigationContainer ref={navigationRef}>
            <RootStack.Navigator>
              <RootStack.Screen
                name="Home"
                options={{
                  title: 'Home',
                  headerRight: () => (
                    <Button title="Modal" onPress={() => navigationRef.navigate('Modal')} />
                  ),
                }}>
                {() => (
                  <HomeScreen
                    openNested={() => setNestedVisible(true)}
                    openModal={() => navigationRef.navigate('Modal')}
                    delayUnmount={delayUnmount}
                    setDelayUnmount={setDelayUnmount}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen
                name="Modal"
                component={ModalNavigator}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
            </RootStack.Navigator>
          </NavigationContainer>
          {nestedVisible ? <NestedStackSheet /> : null}
        </UnmountNestedContext.Provider>
        <HeartbeatOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111214',
  },
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: '#111214',
  },
  modal: {
    backgroundColor: '#1e1f22',
  },
  title: {
    color: '#f2f3f5',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  copy: {
    color: '#b5bac1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  rowLabel: {
    color: '#f2f3f5',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  buttonGap: {
    marginBottom: 12,
  },
  action: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#da373c',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetBackground: {
    backgroundColor: '#2b2d31',
  },
  plainSheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 360,
    backgroundColor: '#2b2d31',
  },
  nestedScreen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#2b2d31',
  },
  heartbeat: {
    position: 'absolute',
    right: 12,
    zIndex: 99999,
    alignItems: 'center',
  },
  heartbeatBox: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#FF00AA',
  },
  heartbeatTick: {
    marginTop: 4,
    color: '#FF00AA',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

export default App;
