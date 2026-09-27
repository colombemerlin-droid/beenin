import { StoreProvider, useStore } from './state/store';
import { PhoneFrame, TopInset } from './ui/PhoneFrame';
import { TabBar } from './components/TabBar';
import { Toast } from './ui/Toast';
import { Sheet } from './ui/Sheet';
import { SignInScreen } from './screens/SignInScreen';
import { ChooseHandleScreen } from './screens/ChooseHandleScreen';
import { SignupScreen } from './screens/SignupScreen';
import { MapScreen } from './screens/MapScreen';
import { FeedScreen } from './screens/FeedScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddStoryScreen } from './screens/AddStoryScreen';
import { HistoryOverlay } from './screens/overlays/HistoryOverlay';
import { FriendsOverlay } from './screens/overlays/FriendsOverlay';
import { FriendRequestsOverlay } from './screens/overlays/FriendRequestsOverlay';
import { PersonOverlay } from './screens/overlays/PersonOverlay';
import { PostDetailOverlay } from './screens/overlays/PostDetailOverlay';
import { GroupMapOverlay } from './screens/overlays/GroupMapOverlay';
import { NewMapOverlay } from './screens/overlays/NewMapOverlay';
import { MapPickerOverlay } from './screens/overlays/MapPickerOverlay';

function AppShell() {
  const { state } = useStore();

  if (state.authLoading) {
    return (
      <PhoneFrame>
        <TopInset />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />
      </PhoneFrame>
    );
  }

  if (!state.signedIn) {
    return (
      <PhoneFrame>
        <TopInset />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <SignInScreen />
        </div>
      </PhoneFrame>
    );
  }

  if (state.onboardingStep === 'handle') {
    return (
      <PhoneFrame>
        <TopInset />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ChooseHandleScreen />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopInset />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {state.tab === 'map' && <MapScreen />}
        {state.tab === 'feed' && <FeedScreen />}
        {state.tab === 'notifications' && <NotificationsScreen />}
        {state.tab === 'profile' && <ProfileScreen />}

        <HistoryOverlay />
        <FriendsOverlay />
        <FriendRequestsOverlay />
        <PersonOverlay />
        <PostDetailOverlay />
        <GroupMapOverlay />
        <NewMapOverlay />
        <MapPickerOverlay />

        {state.story && <AddStoryScreen />}
        {state.signup && <SignupScreen />}

        <Sheet />
        <Toast />
      </div>
      {/* Writing a story and backfilling are full-screen flows with their own footer. */}
      {!state.story && !state.signup && <TabBar />}
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
