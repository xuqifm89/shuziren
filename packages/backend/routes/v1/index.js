const express = require('express');
const router = express.Router();

router.use('/audio', require('../audio'));
router.use('/video', require('../video'));
router.use('/text', require('../text'));
router.use('/clips', require('../clips'));
router.use('/models', require('../models'));
router.use('/users', require('../users'));
router.use('/voice-library', require('../voiceLibrary'));
router.use('/dubbing-library', require('../dubbingLibrary'));
router.use('/music-library', require('../musicLibrary'));
router.use('/portrait-library', require('../portraitLibrary'));
router.use('/copy-library', require('../copyLibrary'));
router.use('/prompt-library', require('../promptLibrary'));
router.use('/work-library', require('../workLibrary'));
router.use('/publish', require('../publish'));
router.use('/runninghub', require('../runningHub'));
router.use('/tasks', require('../tasks'));
router.use('/ws', require('../websocket'));

module.exports = router;
