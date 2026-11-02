const fs = require('fs');
const path = require('path');

const behaviourPath = path.join(__dirname, 'src/components/modules/settings/behaviour-settings.tsx');
let behaviourContent = fs.readFileSync(behaviourPath, 'utf8');

// Remove auth imports and usages
behaviourContent = behaviourContent.replace(/import \{\n  isAnonymousUser,\n  useAuthActions,\n  useAuthUser,\n\} from "@\/hooks\/use-auth";\n/, '');
behaviourContent = behaviourContent.replace(/  const \{ user \} = useAuthUser\(\);\n  const \{ logout, isLoggingIn, loginWithGoogle \} = useAuthActions\(\);\n/, '');
behaviourContent = behaviourContent.replace(/  const \[signOutTarget, setSignOutTarget\] = useState\(false\);\n/, '');
behaviourContent = behaviourContent.replace(/  const handleLogout = async \(\) => \{[\s\S]*?  \};\n/, '');
// Remove logout section UI
behaviourContent = behaviourContent.replace(/        \{\!isAnonymousUser\(user\) && \([\s\S]*?        \)\}\n/, '');
behaviourContent = behaviourContent.replace(/      \{signOutTarget && \([\s\S]*?      \)\}\n/, '');

fs.writeFileSync(behaviourPath, behaviourContent);

const historySidebarPath = path.join(__dirname, 'src/components/shared/history-sidebar.tsx');
if (fs.existsSync(historySidebarPath)) {
  let historyContent = fs.readFileSync(historySidebarPath, 'utf8');
  historyContent = historyContent.replace(/import \{ isAnonymousUser, useAuthUser \} from "@\/hooks\/use-auth";\n/, '');
  historyContent = historyContent.replace(/  const \{ user \} = useAuthUser\(\);\n/, '');
  fs.writeFileSync(historySidebarPath, historyContent);
}

const homePath = path.join(__dirname, 'src/pages/translate/home.tsx');
let homeContent = fs.readFileSync(homePath, 'utf8');
homeContent = homeContent.replace(/import \{ isAnonymousUser, useAuthUser \} from "@\/hooks\/use-auth";\n/, '');
homeContent = homeContent.replace(/  const \{ user \} = useAuthUser\(\);\n/, '');
homeContent = homeContent.replace(/      if \(data.id && signedInUserId\) \{/g, '      if (data.id) {');
fs.writeFileSync(homePath, homeContent);

console.log("Cleaned auth usages.");
