export const base44 = {
  auth: {
    me: async () => null,
    logout: () => {},
    deleteAccount: async () => {},
    redirectToLogin: () => {},
  },
  integrations: {
    Core: {
      InvokeLLM: async () => '🎯',
    },
  },
};
