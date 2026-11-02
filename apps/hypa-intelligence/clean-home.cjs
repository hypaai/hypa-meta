const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, 'src/pages/translate/home.tsx');
let content = fs.readFileSync(homePath, 'utf8');

// Remove profileOpen state
content = content.replace(/  const \[profileOpen, setProfileOpen\] = useState\(false\);\n/, '');

// Remove effect using profileOpen
content = content.replace(/  useEffect\(\(\) => \{\n    if \(hasPendingOperations && profileOpen\) \{\n      setProfileOpen\(false\);\n    \}\n  \}, \[hasPendingOperations, profileOpen\]\);\n/, '');

// Remove onProfileOpen
content = content.replace(/        onProfileOpen=\{\(\) => \{\n          setProfileOpen\(true\);\n        \}\}\n/g, '');
content = content.replace(/        onProfileOpen=\{\(\) => setProfileOpen\(true\)\}\n/g, '');

// Remove setProfileOpen calls
content = content.replace(/                            setProfileOpen\(false\);\n/g, '');
content = content.replace(/              setProfileOpen\(false\);\n/g, '');

// Remove ProfileSidebar render
content = content.replace(/      <ProfileSidebar\n        isOpen=\{profileOpen\}\n        onClose=\{\(\) => setProfileOpen\(false\)\}\n      \/>\n/, '');

fs.writeFileSync(homePath, content);
console.log("Cleaned home.tsx");
