export function checkProcessByPid(pid: number) {
    try {
        return process.kill(pid, 0);
    } catch (error) {
        if (error.code === 'EPERM' || error.code === 'ESRCH') {
            return false;
        } else {
            throw error;
        }
    }
}

export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve(); }, ms);
    });
}
