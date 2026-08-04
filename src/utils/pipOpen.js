/**
 * Shared opener for Ask PiP (SearchAIModal).
 * BottomNavigation listens and opens the modal with optional chat handoff.
 */

export const PIP_OPEN_EVENT = 'tpp:open-pip';

/**
 * @param {object} [opts]
 * @param {string} [opts.prompt] - Prompt to send (encoded stack handoff or plain text)
 * @param {boolean} [opts.autoSend=true] - Auto-send after open
 * @param {boolean} [opts.freshChat=false] - Clear current PiP session first
 * @param {string} [opts.displayContent] - Short bubble text when prompt is encoded/long
 */
export function openPipChat(opts = {}) {
  const detail = {
    prompt: typeof opts.prompt === 'string' ? opts.prompt : '',
    autoSend: opts.autoSend !== false,
    freshChat: Boolean(opts.freshChat),
    displayContent: typeof opts.displayContent === 'string' ? opts.displayContent : '',
    fromStack: Boolean(opts.fromStack),
  };
  try {
    window.dispatchEvent(new CustomEvent(PIP_OPEN_EVENT, { detail }));
  } catch (err) {
    console.warn('openPipChat failed:', err);
  }
}
