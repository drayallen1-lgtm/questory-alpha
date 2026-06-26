import { TIMELINE_ACTIONS } from './timelineEngine';

/** Maps active timeline FX actions to CSS classes on the cinematic player root */
export function getCameraFxClassList(activeFx) {
  const fx = activeFx instanceof Set ? activeFx : new Set(activeFx || []);
  const classes = ['cinematic-fx-root'];

  if (fx.has(TIMELINE_ACTIONS.FOG)) classes.push('fx-fog');
  if (fx.has(TIMELINE_ACTIONS.DARKNESS)) classes.push('fx-darkness');
  if (fx.has(TIMELINE_ACTIONS.STATIC)) classes.push('fx-static');
  if (fx.has(TIMELINE_ACTIONS.VIGNETTE)) classes.push('fx-vignette');
  if (fx.has(TIMELINE_ACTIONS.BLUR)) classes.push('fx-blur');
  if (fx.has(TIMELINE_ACTIONS.FLICKER)) classes.push('fx-flicker');
  if (fx.has(TIMELINE_ACTIONS.HEARTBEAT)) classes.push('fx-heartbeat');
  if (fx.has(TIMELINE_ACTIONS.CHROMATIC)) classes.push('fx-chromatic');
  if (fx.has(TIMELINE_ACTIONS.CAMERA_SHAKE)) classes.push('fx-shake');
  if (fx.has(TIMELINE_ACTIONS.FLASH)) classes.push('fx-flash');
  if (fx.has(TIMELINE_ACTIONS.RED_FLASH)) classes.push('fx-red-flash');
  if (fx.has(TIMELINE_ACTIONS.WHITE_FLASH)) classes.push('fx-white-flash');

  return classes;
}
