const { User } = require('./models');

async function run() {
    try {
        const user = await User.findOne({ where: { email: 'jhadeorlanda117@gmail.com' } });
        console.log('User 4 info:', user ? user.toJSON() : 'Not Found');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
