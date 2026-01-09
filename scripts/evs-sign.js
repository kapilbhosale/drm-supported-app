const { execSync } = require('child_process');

module.exports = async function (context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName === 'darwin') {
        console.log('Signing with EVS for macOS...');
        try {
            execSync(`python3 -m castlabs_evs.vmp sign-pkg "${appOutDir}"`, {
                stdio: 'inherit'
            });
            console.log('EVS signing completed successfully');
        } catch (error) {
            console.error('EVS signing failed:', error);
            throw error;
        }
    } else if (electronPlatformName === 'win32') {
        console.log('Signing with EVS for Windows...');
        try {
            // On Windows, use 'python' instead of 'python3' usually, or ensure python is in PATH
            execSync(`python -m castlabs_evs.vmp sign-pkg "${appOutDir}"`, {
                stdio: 'inherit'
            });
            console.log('EVS signing completed successfully');
        } catch (error) {
            console.error('EVS signing failed:', error);
            throw error;
        }
    }
};
