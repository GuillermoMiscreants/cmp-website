type Debugger = ((...args: unknown[]) => void) & {
  enabled: boolean;
  extend: (namespace: string) => Debugger;
  destroy: () => void;
};

function create(_namespace?: string): Debugger {
  const log = ((..._args: unknown[]) => {}) as Debugger;
  log.enabled = false;
  log.destroy = () => {};
  log.extend = () => create();
  return log;
}

export default create;
