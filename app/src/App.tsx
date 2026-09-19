import { StoreProvider, useStore } from './state/store';
import { PhoneFrame, StatusBar } from './ui/PhoneFrame';
import { TabBar } from './components/TabBar';
import { Toast } from './ui/Toast';
import { Sheet } from './ui/Sheet';
import { SignInScreen } from './screens/SignInScreen';
import { SignupScreen } from './screens/SignupScreen';
import { MapScreen } from './screens/MapScreen';
import { FeedScreen } from './screens/FeedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddEntryScreen } from './screens/AddEntryScreen';
import { HistoryOverlay } from './screens/overlays/HistoryOverlay';
import { FriendsOverlay } from './screens/overlays/FriendsOverlay';
import { PersonOverlay } from './screens/overlays/PersonOverlay';
import { PostDetailOverlay } from './screens/overlays/PostDetailOverlay';

function AppShell() {
  const { state } = useStore();

  if (!state.signedIn) {
    return (
      <PhoneFrame>
        <StatusBar />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <SignInScreen />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <StatusBar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {state.tab === 'map' && <MapScreen />}
        {state.tab === 'feed' && <FeedScreen />}
        {state.tab === 'profile' && <ProfileScreen />}

        <HistoryOverlay />
        <FriendsOverlay />
        <PersonOverlay />
        <PostDetailOverlay />

        {state.add && <AddEntryScreen />}
        {state.signup && <SignupScreen />}

        <Sheet />
        <Toast />
      </div>
      <TabBar />
    </PhoneFrame>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
