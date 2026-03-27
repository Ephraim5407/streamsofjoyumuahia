const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed', filePath);
}

// 1. webLoader.ts
replaceInFile(path.join(__dirname, 'src/api/webLoader.ts'), [
  ["import { PRIMARY_BLUE } from '@screens/AuthScreens/SuperAdmin/styles';\n", ""],
  ["import * as WebBrowser from 'expo-web-browser';\n", ""],
  ["import Toast from 'react-native-toast-message';\n", ""],
  [
`export const _openLink = async (link:string) => {
    try {
      const result = await WebBrowser.openBrowserAsync(link, {
        // Optional customizations
        toolbarColor: PRIMARY_BLUE,      // Android toolbar color
        controlsColor: '#FFFFFF',     // Android controls (back/close) color
        dismissButtonStyle: 'close',  // iOS: 'done' | 'close' | 'cancel'
        showTitle: true,              // Show page title
      });

      // result.type can be 'opened', 'cancel', 'dismissed', etc.
      if (result.type === 'dismiss') {
        Toast.show({
          type: 'success',
          text1: 'Browser closed',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not open browser check your internet connection',
      });
    }
  };`,
`export const _openLink = async (link:string) => {
    window.open(link, '_blank');
  };`
  ]
]);

// 2. ManageUnit.tsx
replaceInFile(path.join(__dirname, 'src/screens/AuthScreens/UnitLeader/ManageUnit.tsx'), [
  ["activeUnitId = summary?.unit?._id;", "activeUnitId = summary?.unit?._id || null;"]
]);

// 3. FinanceSummary.tsx
replaceInFile(path.join(__dirname, 'src/screens/main/FinanceSummary.tsx'), [
  ["PieChart as PieIcon, BarChart3, Download, History", "PieChart as PieIcon, BarChart3, Download, History, Plus"]
]);

// 4. MemberDashboard.tsx
replaceInFile(path.join(__dirname, 'src/screens/main/Member/MemberDashboard.tsx'), [
  ["import { getEffectiveActiveUnitId } from '../../../utils/activeUnit';", ""],
  ["const unitId = await getEffectiveActiveUnitId();", "const unitId = await AsyncStorage.getItem('activeUnitId');"],
  ["icon: JSX.Element", "icon: React.ReactNode"],
  ["RefreshCw, ShoppingCart", "RefreshCw, ShoppingCart, Banknote"]
]);

// 5. MemberList.tsx
replaceInFile(path.join(__dirname, 'src/screens/main/MemberList.tsx'), [
  ["setFilters(f=>({...f, gender: g}))", "setFilters((f: any) => ({...f, gender: g}))"],
  ["setFilters(f=>({...f, employment: e.target.value}))", "setFilters((f: any) => ({...f, employment: e.target.value}))"],
  ["setFilters(f=>({...f, marital: e.target.value}))", "setFilters((f: any) => ({...f, marital: e.target.value}))"]
]);

// 6. Notification.tsx
replaceInFile(path.join(__dirname, 'src/screens/main/Notification.tsx'), [
  [
`const off2 = AppEventBus.on((event: string) => {
      if (event === 'refreshNotifications') loadData(true);
    });`,
`const off2 = AppEventBus.on('refreshNotifications', () => {
      loadData(true);
    });`
  ]
]);

// 7. UnitLeaderDashboard.tsx
replaceInFile(path.join(__dirname, 'src/screens/main/UnitLeader/UnitLeaderDashboard.tsx'), [
  [
"export default function UnitLeaderDashboard() {",
`function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' '); }
export default function UnitLeaderDashboard() {`
  ]
]);

console.log('All fixed.');
