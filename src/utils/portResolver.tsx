export const resolvePort = (defaultPort: number = 3000): number => {
  return process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
};