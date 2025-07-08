import app from './src/app';
import { config } from './src/config';

// Start the server
const server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err);

    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});