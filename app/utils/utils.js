import pathR from 'path';
import fsR from 'fs';
import log from 'electron-log';
import {
  DEFAULT_THUMB_COUNT, DEFAULT_COLUMN_COUNT, DEFAULT_MOVIE_WIDTH, DEFAULT_MOVIE_HEIGHT,
  SHOW_PAPER_ADJUSTMENT_SCALE, DEFAULT_MIN_MOVIEPRINTWIDTH_MARGIN
} from './constants';
import VideoCaptureProperties from '../utils/videoCaptureProperties';

const randomColor = require('randomcolor');
const { ipcRenderer } = require('electron');

export const ensureDirectoryExistence = (filePath, isDirectory = true) => {
  let dirname;
  if (isDirectory) {
    dirname = filePath;
  } else {
    dirname = pathR.dirname(filePath);
  }
  log.debug(dirname);
  if (fsR.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname, false);
  fsR.mkdirSync(dirname);
};

export const clearCache = (win) => {
  win.webContents.session.getCacheSize((cacheSizeBefore) => {
    log.debug(`cacheSize before: ${cacheSizeBefore}`);
    // clear HTTP cache
    win.webContents.session.clearCache(() => {
      // then clear data of web storages
      win.webContents.session.clearStorageData(() => {
        // then print cacheSize
        win.webContents.session.getCacheSize((cacheSizeAfter) => {
          log.debug(`cacheSize after: ${cacheSizeAfter}`);
          // and reload to use initialStateJSON
          win.webContents.reload();
        });
      });
    });
  });
};

// prevent typeerrors when accessing nested props of a none-existing object
// usage getObjectProperty(() => objectA.propertyB)
export const getObjectProperty = (fn) => {
  let value;
  try {
    value = fn();
    return value;
  } catch (e) {
    value = undefined;
    return value;
  }
};

export const mapRange = (value, low1, high1, low2, high2, returnInt = true) => {
  // special case, prevent division by 0
  if ((high1 - low1) === 0) {
    return 0;
  }
  // * 1.0 added to force float division
  let newValue = low2 + ((high2 - low2) * (((value - low1) * 1.0) / (high1 - low1)));
  newValue = Math.round((newValue * 1000) + Number.EPSILON) / 1000; // rounds the number with 3 decimals
  if (returnInt) {
    newValue = Math.round(newValue);
  }
  return Math.min(Math.max(newValue, low2), high2);
};

export const limitRange = (value, lowerLimit, upperLimit) =>
  // value || 0 makes sure that NaN s are turned into a number to work with
  Math.min(Math.max(value || 0, lowerLimit || 0), upperLimit || 0);

export const truncate = (n, len) => {
  const ext = n.substring(n.lastIndexOf('.') + 1, n.length).toLowerCase();
  let filename = n.substring(0, n.lastIndexOf('.'));
  if (filename.length <= len) {
    return n;
  }
  filename = filename.substr(0, len) + (n.length > len ? '...' : '');
  return `${filename}.${ext}`;
};

export const truncatePath = (n, len) => {
  // check if length of string is actually longer than truncate length
  // if not return the original string without truncation
  // value of 3 compensates for ... (the 3 dots)
  if ((n.length - 3) > len) {
    const front = n.slice(0, (len / 2) - 1); // compensate for dots
    const back = n.slice((-len / 2) - 2); // compensate for dots
    return `${front}...${back}`;
  }
  return n;
};


export const pad = (num, size) => {
  if (size !== undefined) {
    let s = (num !== undefined) ? num.toString() : '';
    while (s.length < size) s = `${(num !== undefined) ? '0' : '–'}${s}`;
    return s;
  }
  return undefined;
};

export const secondsToFrameCount = (seconds = 0, fps = 25) => {
  const frames = Math.round(seconds * fps * 1.0);
  return frames;
};

export const frameCountToSeconds = (frames, fps = 25) => {
  const seconds = (frames !== undefined ? ((frames * 1.0) / fps) : 0);
  return seconds;
};

export const frameCountToTimeCode = (frames, fps = 25) => {
  // fps = (fps !== undefined ? fps : 30);
  if (frames !== undefined) {
    const paddedValue = (input) => ((input < 10) ? `0${input}` : input);
    const seconds = (frames !== undefined ? frames / fps : 0);
    return [
      paddedValue(Math.floor(seconds / 3600)),
      paddedValue(Math.floor((seconds % 3600) / 60)),
      paddedValue(Math.floor(seconds % 60)),
      paddedValue(Math.floor(frames % fps))
    ].join(':');
  }
  return '––:––:––:––';
};

export const secondsToTimeCode = (seconds = 0, fps = 25) => {
  const pad = (input) => ((input < 10) ? `0${input}` : input);

  return [
    pad(Math.floor(seconds / 3600)),
    pad(Math.floor((seconds % 3600) / 60)),
    pad(Math.floor(seconds % 60)),
    pad(Math.floor((seconds * fps) % fps))
    // pad(Math.floor((seconds - Math.floor(seconds)) * 1000), 3, '0')
  ].join(':');
};

export const formatBytes = (bytes, decimals) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals || 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  return `${parseFloat((bytes / (k ** i)).toFixed(dm))} ${sizes[i]}`;
};

export const saveBlob = (blob, fileId, fileName) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (reader.readyState === 2) {
      const buffer = Buffer.from(reader.result);
      ipcRenderer.send('send-save-file', fileId, fileName, buffer, true);
      log.debug(`Saving ${JSON.stringify({ fileName, size: blob.size })}`);
    }
  };
  try {
    reader.readAsArrayBuffer(blob);
  } catch (e) {
    ipcRenderer.send('send-save-file-error', true);
  }
};

export const getMimeType = (outputFormat) => {
  switch (outputFormat) {
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
};

export const getMoviePrintColor = (count) => {
  log.debug(`creating new newColorArray[${count}]`);
  const newColorArray = randomColor({
    count,
    hue: '#FF5006',
  });
  return newColorArray;
};

export const getFilePathObject = (
  fileName,
  postfix = '',
  outputFormat,
  // exportPath = '',
  exportPath = app.getPath('desktop'),
  overwrite = false
) => {
  // in case there is no file loaded give standard name
  let newFileName = fileName !== undefined ? `${fileName}${postfix}.${outputFormat}` :
    `MoviePrint.${outputFormat}`;
  let newFilePathAndName = pathR.join(exportPath, newFileName);

  if (!overwrite) {
    if (fsR.existsSync(newFilePathAndName)) {
      for (let i = 1; i < 1000; i += 1) {
        newFileName = fileName !== undefined ? `${fileName}${postfix} edit ${i}.${outputFormat}` :
          `MoviePrint edit ${i}.${outputFormat}`;
        newFilePathAndName = pathR.join(exportPath, newFileName);
        if (!fsR.existsSync(newFilePathAndName)) {
          break;
        }
      }
    }
  }
  return pathR.parse(newFilePathAndName);
};

export const getThumbInfoValue = (type, frames, framesPerSecond) => {
  switch (type) {
    case 'frames':
      return pad(frames, 4);
    case 'timecode':
      return frameCountToTimeCode(frames, framesPerSecond);
    case 'hideInfo':
      return undefined;
    default:
      return undefined;
  }
};

export const getLowestFrame = (thumbs) => {
  if (thumbs && (thumbs.length > 0)) {
    return thumbs.reduce(
      (min, p) => (p.frameNumber < min ? p.frameNumber : min),
      thumbs[0].frameNumber
    );
  }
  return undefined;
};

export const getHighestFrame = (thumbs) => {
  if (thumbs && (thumbs.length > 0)) {
    return thumbs.reduce(
      (max, p) => (p.frameNumber > max ? p.frameNumber : max),
      thumbs[0].frameNumber
    );
  }
  return undefined;
};

export const getAllFrameNumbers = (thumbs) => {
  if (thumbs && (thumbs.length > 0)) {
    return thumbs.map(
      thumb => thumb.frameNumber
    );
  }
  return [];
};

export const getPreviousThumbs = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      const currentIndex = thumbs.find((thumb) => thumb.thumbId === thumbId).index;
      return thumbs.filter((thumb) => ((thumb.hidden === false) &&
        (thumb.index < currentIndex)));
    }
    return thumbs; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getNextThumbs = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      const currentIndex = thumbs.find((thumb) => thumb.thumbId === thumbId).index;
      return thumbs.filter((thumb) => ((thumb.hidden === false) &&
        (thumb.index > currentIndex)));
    }
    return thumbs; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getPreviousThumb = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      const currentIndex = thumbs.find((thumb) => thumb.thumbId === thumbId).index;
      const newIndex = ((currentIndex - 1) >= 0) ? (currentIndex - 1) : (thumbs.length - 1);
      // log.debug(thumbs[newIndex]);
      return thumbs[newIndex];
    }
    return thumbs[thumbs.length - 1]; // return last item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getNextThumb = (thumbs, thumbId) => {
  if (thumbs) {
    if (thumbId) {
      const currentIndex = thumbs.find((thumb) => thumb.thumbId === thumbId).index;
      const newIndex = ((currentIndex + 1) < thumbs.length) ? (currentIndex + 1) : 0;
      // log.debug(thumbs[newIndex]);
      return thumbs[newIndex];
    }
    return thumbs[0]; // return first item if no thumbId provided
  }
  return undefined; // return undefined if no thumbs provided
};

export const getVisibleThumbs = (thumbs, filter) => {
  if (thumbs === undefined) {
    return thumbs;
  }
  switch (filter) {
    case 'SHOW_ALL':
      return thumbs;
    case 'SHOW_HIDDEN':
      return thumbs.filter(t => t.hidden);
    case 'SHOW_VISIBLE':
      return thumbs.filter(t => !t.hidden);
    default:
      return thumbs;
  }
};

export const getAspectRatio = (file) => {
  if (file === undefined || file.width === undefined || file.height === undefined) {
    return (16 * 1.0) / 9; // default 16:9
  }
  return ((file.width * 1.0) / file.height);
};

export const getColumnCount = (file, settings) => {
  if (file === undefined || file.columnCount === undefined) {
    return settings.defaultColumnCount;
  }
  return file.columnCount;
};

export const getThumbsCount = (file, thumbsByFileId, settings, visibilityFilter) => {
  if (file === undefined || file.id === undefined ||
    thumbsByFileId[file.id] === undefined) {
    return settings.defaultThumbCount;
  }
  if (visibilityFilter === 'SHOW_VISIBLE') {
    return thumbsByFileId[file.id].thumbs
      .filter(thumb => thumb.hidden === false).length;
  }
  return thumbsByFileId[file.id].thumbs.length;
};

export const getScaleValueObject = (
  file,
  settings,
  columnCount = DEFAULT_COLUMN_COUNT,
  thumbCount = DEFAULT_THUMB_COUNT,
  containerWidth,
  containerHeight = 99999, // very high value so it is not taken into account when not set
  showMoviePrintView,
  zoomScale,
  showPaperPreview = false
) => {
  const movieWidth = (file !== undefined && file.width !== undefined ? file.width : DEFAULT_MOVIE_WIDTH);
  const movieHeight = (file !== undefined && file.height !== undefined ? file.height : DEFAULT_MOVIE_HEIGHT);
  const movieAspectRatioInv = (movieHeight * 1.0) / movieWidth;
  const rowCount = Math.ceil(thumbCount / columnCount);

  // headerHeight gets increased depending on how much information is shown inside
  const headerHeightMultiplier = 1 + ((settings.defaultShowPathInHeader + settings.defaultShowDetailsInHeader + settings.defaultShowTimelineInHeader) / 3.0);
  const headerHeight = settings.defaultShowHeader ? movieHeight *
    settings.defaultHeaderHeightRatio * headerHeightMultiplier * settings.defaultThumbnailScale : 0;
  const logoHeight = movieHeight * settings.defaultHeaderHeightRatio * settings.defaultThumbnailScale;

  const thumbWidth = movieWidth * settings.defaultThumbnailScale;
  const thumbMargin = movieWidth * settings.defaultMarginRatio * settings.defaultThumbnailScale;
  const borderRadius = settings.defaultRoundedCorners ? movieWidth *
    settings.defaultBorderRadiusRatio * settings.defaultThumbnailScale : 0;
  const thumbnailWidthPlusMargin = thumbWidth + (thumbMargin * 2);
  const thumbnailHeightPlusMargin = (thumbWidth * movieAspectRatioInv) + (thumbMargin * 2);
  const moviePrintWidth = columnCount * thumbnailWidthPlusMargin + thumbMargin;
  const moviePrintHeightBody = rowCount * thumbnailHeightPlusMargin;
  const moviePrintHeight = headerHeight + (thumbMargin * 2) + moviePrintHeightBody;
  const moviePrintAspectRatioInv = (moviePrintHeight * 1.0) / moviePrintWidth;

  // for thumbView
  const videoHeight = ((containerHeight * 2) / 3) - settings.defaultVideoPlayerControllerHeight;
  const videoWidth = videoHeight / movieAspectRatioInv;
  let videoPlayerHeight = videoHeight + settings.defaultVideoPlayerControllerHeight;
  let videoPlayerWidth = videoWidth;
  if (videoWidth > containerWidth) {
    videoPlayerWidth = containerWidth - (settings.defaultBorderMargin * 2);
    videoPlayerHeight = (videoPlayerWidth * movieAspectRatioInv) +
      settings.defaultVideoPlayerControllerHeight;
  }
  const thumbnailHeightForThumbView =
    ((videoPlayerHeight / 2) - (settings.defaultBorderMargin * 3));
  const thumbnailWidthForThumbView = thumbnailHeightForThumbView / movieAspectRatioInv;
  const borderRadiusForThumbView = thumbnailWidthForThumbView * settings.defaultBorderRadiusRatio;
  const thumbMarginForThumbView = Math.max(2, thumbnailWidthForThumbView * settings.defaultMarginRatio);
  const thumbnailWidthPlusMarginForThumbView =
    thumbnailWidthForThumbView + (thumbMarginForThumbView * 2);
  const moviePrintWidthForThumbView =
    (thumbCount * thumbnailWidthPlusMarginForThumbView) + (thumbnailWidthForThumbView / 2); // only one row
    // for thumbView

  // for scrubView
  const scrubContainerHeight = Math.min(
    Math.floor(containerHeight * settings.defaultScrubContainerMaxHeightRatio),
    containerWidth * settings.defaultScrubWindowWidthRatio * movieAspectRatioInv
  )
  const scrubContainerWidth = containerWidth;
  const scrubInnerContainerWidth = Math.min(
    (scrubContainerHeight / movieAspectRatioInv + settings.defaultScrubWindowMargin * 2) * 2,
    scrubContainerWidth
  );
  const scrubMovieHeight = scrubContainerHeight;
  const scrubMovieWidth = Math.min(
    Math.floor(scrubInnerContainerWidth * settings.defaultScrubWindowWidthRatio),
    scrubContainerHeight / movieAspectRatioInv
  );
  const scrubInOutMovieWidth = Math.floor((scrubInnerContainerWidth - scrubMovieWidth) / 2 - (settings.defaultScrubWindowMargin * 2));
  const scrubInOutMovieHeight = Math.floor(scrubInOutMovieWidth * movieAspectRatioInv);
  // for scrubView

  let paperMoviePrintWidth = moviePrintWidth;
  let paperMoviePrintHeight = moviePrintHeight;
  let showPaperAdjustmentScale = 1;
  if (showPaperPreview) {
    showPaperAdjustmentScale = SHOW_PAPER_ADJUSTMENT_SCALE;
    if (settings.defaultPaperAspectRatioInv < moviePrintAspectRatioInv) {
      paperMoviePrintWidth = paperMoviePrintHeight / settings.defaultPaperAspectRatioInv;
      // log.debug(`calculate new paperMoviePrintWidth ${paperMoviePrintWidth}`);
    } else {
      paperMoviePrintHeight = paperMoviePrintWidth * settings.defaultPaperAspectRatioInv;
      // log.debug(`calculate new paperMoviePrintHeight ${paperMoviePrintHeight}`);
    }
  }

  const scaleValueWidth = containerWidth / (showPaperPreview ? paperMoviePrintWidth : moviePrintWidth);
  const scaleValueHeight = containerHeight / (showPaperPreview ? paperMoviePrintHeight : moviePrintHeight);

  const scaleValue = Math.min(scaleValueWidth, scaleValueHeight) * zoomScale * showPaperAdjustmentScale;

  const newMoviePrintWidth =
    showMoviePrintView ? moviePrintWidth * scaleValue + DEFAULT_MIN_MOVIEPRINTWIDTH_MARGIN : moviePrintWidthForThumbView;
  const newMoviePrintHeight = showMoviePrintView ? (newMoviePrintWidth * moviePrintAspectRatioInv) : moviePrintHeight;
  const newThumbMargin = showMoviePrintView ? thumbMargin * scaleValue : thumbMarginForThumbView;
  const newThumbWidth = showMoviePrintView ? thumbWidth * scaleValue : thumbnailWidthForThumbView;
  const newBorderRadius = showMoviePrintView ? borderRadius * scaleValue : borderRadiusForThumbView;
  const newHeaderHeight = showMoviePrintView ? headerHeight * scaleValue : headerHeight;
  const newLogoHeight = showMoviePrintView ? logoHeight * scaleValue : logoHeight;
  const newScaleValue = showMoviePrintView ? settings.defaultThumbnailScale * scaleValue :
    settings.defaultThumbnailScale;

  const scaleValueObject = {
    containerWidth,
    containerHeight,
    aspectRatioInv: movieAspectRatioInv,
    newMoviePrintWidth,
    newMoviePrintHeight,
    moviePrintAspectRatioInv,
    newThumbMargin,
    newThumbWidth,
    newBorderRadius,
    newHeaderHeight,
    newLogoHeight,
    newScaleValue,
    videoPlayerHeight,
    videoPlayerWidth,
    scrubMovieWidth,
    scrubMovieHeight,
    scrubInOutMovieWidth,
    scrubInOutMovieHeight,
    scrubContainerHeight,
    scrubContainerWidth,
    scrubInnerContainerWidth,
  };
  // log.debug(scaleValueObject);
  return scaleValueObject;
};

export const setPosition = (vid, frameNumberToCapture, useRatio) => {
  if (useRatio) {
    const positionRatio =
      frameNumberToCapture *
      1.0 /
      (vid.get(VideoCaptureProperties.CAP_PROP_FRAME_COUNT) - 1);
    // log.debug(`using positionRatio: ${positionRatio}`);
    vid.set(VideoCaptureProperties.CAP_PROP_POS_AVI_RATIO, positionRatio);
  } else {
    vid.set(VideoCaptureProperties.CAP_PROP_POS_FRAMES, frameNumberToCapture);
  }
};

export const renderImage = (img, canvas, cv) => {
  const matRGBA = img.channels === 1 ? img.cvtColor(cv.COLOR_GRAY2RGBA) : img.cvtColor(cv.COLOR_BGR2RGBA);

  canvas.height = img.rows;
  canvas.width = img.cols;
  const imgData = new ImageData(
    new Uint8ClampedArray(matRGBA.getData()),
    img.cols,
    img.rows
  );
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imgData, 0, 0);
}

export const getScrubFrameNumber = (
  mouseX,
  keyObject,
  scaleValueObject,
  frameCount,
  scrubThumb,
  scrubThumbLeft,
  scrubThumbRight
) => {
  let scrubFrameNumber;

  // depending on if scrubbing over ScrubMovie change mapping range
  // scrubbing over ScrubMovie scrubbs over scene, scrubbing left or right of it scrubs over whole movie
  // depending on if add before (shift) or after (alt) changing the mapping range
  const tempLeftFrameNumber = keyObject.altKey ? scrubThumb.frameNumber : scrubThumbLeft.frameNumber
  const tempRightFrameNumber = keyObject.shiftKey ? scrubThumb.frameNumber : scrubThumbRight.frameNumber
  const leftOfScrubMovie = (scaleValueObject.scrubInnerContainerWidth - scaleValueObject.scrubMovieWidth) / 2;
  const rightOfScrubMovie = leftOfScrubMovie + scaleValueObject.scrubMovieWidth;
  if (mouseX < leftOfScrubMovie) {
    scrubFrameNumber = mapRange(mouseX, 0, leftOfScrubMovie, 0, tempLeftFrameNumber);
  } else if (mouseX > rightOfScrubMovie) {
    scrubFrameNumber = mapRange(mouseX, rightOfScrubMovie, scaleValueObject.containerWidth, tempRightFrameNumber, frameCount - 1);
  } else {
    scrubFrameNumber = mapRange(mouseX, leftOfScrubMovie, rightOfScrubMovie, tempLeftFrameNumber, tempRightFrameNumber);
  }
  return scrubFrameNumber;
}

export const deleteProperty = ({[key]: _, ...newObj}, key) => newObj;

export const isEquivalent = (a, b) => {
    // Create arrays of property names
    const aProps = Object.getOwnPropertyNames(a);
    const bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length !== bProps.length) {
        return false;
    }

    for (let i = 0; i < aProps.length; i += 1) {
        const propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}

export const fourccToString = (fourcc) =>
  `${String.fromCharCode(fourcc & 0XFF)}${String.fromCharCode((fourcc & 0XFF00) >> 8)}${String.fromCharCode((fourcc & 0XFF0000) >> 16)}${String.fromCharCode((fourcc & 0XFF000000) >> 24)}`

export const roundNumber = (number, decimals = 2) =>
  Math.round((number * (10 ** decimals)) + Number.EPSILON) / (10 ** decimals); // rounds the number with 3 decimals

export const getTextWidth = (text, font) => {
    // re-use canvas object for better performance
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
}

export const limitFrameNumberWithinMovieRange = (file, frameNumber) => {
    const limitedFrameNumber = Math.min((file.frameCount - 1), Math.max(0, frameNumber)); // limit it on lower and on upper end
    return limitedFrameNumber;
}
