export default [
  {
    files: ["api/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        crypto: "readonly",
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Promise: "readonly",
        JSON: "readonly",
        btoa: "readonly",
        atob: "readonly",
        structuredClone: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        AbortSignal: "readonly",
        AbortController: "readonly",
      }
    },
    rules: {
      // Edge runtime — 절대 금지
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.name='require']",
          "message": "❌ Edge Runtime: require() 사용 불가. ES import 사용."
        }
      ],
      "no-restricted-globals": [
        "error",
        { "name": "__dirname", "message": "❌ Edge Runtime: __dirname 사용 불가." },
        { "name": "__filename", "message": "❌ Edge Runtime: __filename 사용 불가." }
      ],
      "no-restricted-imports": [
        "error",
        { "name": "fs", "message": "❌ Edge Runtime: fs 모듈 사용 불가." },
        { "name": "path", "message": "❌ Edge Runtime: path 모듈 사용 불가." },
        { "name": "os", "message": "❌ Edge Runtime: os 모듈 사용 불가." },
        { "name": "child_process", "message": "❌ Edge Runtime: child_process 사용 불가." }
      ],

      // 일반 품질
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": ["warn", { "allow": ["error", "warn"] }],
      "eqeqeq": ["error", "always"],
    }
  },
];
