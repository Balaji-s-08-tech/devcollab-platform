module.exports = {
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react/jsx-runtime"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "react/jsx-no-comment-textnodes": "off",
    "no-empty": "off",
    "no-console": "off",
  },
  ignorePatterns: ["node_modules/", "dist/", "coverage/"],
};
