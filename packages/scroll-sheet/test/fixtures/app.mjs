// One small app for the React and Preact fixtures: an uncontrolled sheet opened by a trigger that
// works before hydration, a controlled one whose owner can refuse changes (window.__refuse), and a
// controlled one that is always closed. `h` is the framework's createElement, `adapter`
// the adapter module under test, `useState` the framework's hook.
export const sizes = ['30 ml', '50 ml', '100 ml'];
// Enough content that the sheet's full height and its 50dvh snap point differ.
export const notes = Array.from({ length: 16 }, (_, i) => `Care note ${i + 1}`);

const log = (entry) => typeof window != 'undefined' && (window.__changes ||= []).push(entry);

export function App({ h, adapter, useState }) {
  const { Sheet, SheetTrigger, SheetHandle, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter } = adapter;
  const [open, setOpen] = useState(false);
  return h(
    'main',
    { style: { maxWidth: '900px', margin: '0 auto', padding: '16px', fontFamily: 'system-ui, sans-serif' } },
    h('h1', null, 'Fixture'),
    h(SheetTrigger, { sheet: 'fixture-sheet', id: 'open-fixture' }, 'Choose a size'),
    h('button', { type: 'button', id: 'open-controlled', onClick: () => setOpen(true) }, 'Open the controlled sheet'),
    h(
      Sheet,
      {
        id: 'fixture-sheet',
        snapPoints: ['50dvh'],
        initialSnap: 0,
        onOpenChange: (next, { reason }) => log(`uncontrolled ${next} ${reason}`),
      },
      h(SheetHandle),
      h(SheetHeader, null, h(SheetTitle, null, 'Choose a size'), h(SheetClose)),
      h(
        SheetBody,
        null,
        h(
          'ul',
          null,
          sizes.map((size) => h('li', { key: size }, size)),
        ),
        notes.map((note) => h('p', { key: note }, note)),
      ),
      h(SheetFooter, null, h('button', { type: 'button' }, 'Add to bag')),
    ),
    h(
      Sheet,
      {
        id: 'controlled-sheet',
        presentation: 'center',
        open,
        onOpenChange: (next, { reason }) => {
          log(`controlled ${next} ${reason}`);
          if (!window.__refuse) setOpen(next);
        },
      },
      h(SheetHeader, null, h(SheetTitle, null, 'Controlled'), h(SheetClose)),
      h(
        SheetBody,
        null,
        h('p', null, 'Its state lives in the app.'),
        h('form', { method: 'dialog' }, h('button', { id: 'submit-controlled' }, 'Done')),
        // Closes by prop and opens again before the close has finished.
        h(
          'button',
          {
            type: 'button',
            id: 'flip-controlled',
            onClick: () => {
              setOpen(false);
              setTimeout(() => setOpen(true), 60);
            },
          },
          'Close and reopen',
        ),
      ),
    ),
    h(SheetTrigger, { sheet: 'closed-sheet', id: 'open-closed' }, 'Try the closed sheet'),
    h(
      Sheet,
      {
        id: 'closed-sheet',
        presentation: 'center',
        open: false,
        onOpenChange: (next, { reason }) => log(`closed ${next} ${reason}`),
      },
      h(SheetHeader, null, h(SheetTitle, null, 'Always closed'), h(SheetClose)),
    ),
    h('div', { style: { height: '150vh' } }, 'Below.'),
  );
}
