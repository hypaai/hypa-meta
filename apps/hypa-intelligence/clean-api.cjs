const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'src/lib/api.ts');
let content = fs.readFileSync(apiPath, 'utf8');

// Remove useAuthStore import
content = content.replace(/import { useAuthStore } from "@\/stores\/auth-store";\n/, '');

// Remove token and interceptors
content = content.replace(/const TOKEN_KEY = "hypa-api-token";[\s\S]*?function assertAuthenticated\(\) \{\n  \/\/ No-op for now, auth removed\n\}\n/g, '');

// Remove Auth interfaces
content = content.replace(/export interface AuthResponse \{[\s\S]*?export interface RegisterParams extends LoginParams \{[\s\S]*?\}\n/g, '');

// Remove Profile code
content = content.replace(/\/\/ PROFILE[\s\S]*?export const profile = \{\n  getProfile,\n\};\n/g, '');

// Remove Auth code
content = content.replace(/\/\/ AUTH[\s\S]*?export const auth = \{\n  login,\n  register,\n\};\n/g, '');

// Remove deleteAccountAPI
content = content.replace(/export interface DeleteAccountResponse \{[\s\S]*?export const deleteAccountAPI = async \(\) => \{[\s\S]*?return \{ data: \{ success: true \} \};\n\};\n/g, '');

// Remove assertAuthenticated() calls
content = content.replace(/  assertAuthenticated\(\);\n/g, '');

fs.writeFileSync(apiPath, content);
console.log("Cleaned api.ts");
