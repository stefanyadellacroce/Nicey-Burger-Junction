/** Safe DOM helpers. User-provided content is written through textContent. */

const BOOLEAN_PROPERTIES =
  new Set([
    'checked',
    'selected',
    'disabled',
    'hidden',
    'open',
    'required',
    'multiple',
    'readOnly'
  ]);

export function el(
  tag,
  attrs = {},
  children = []
) {
  const node =
    document.createElement(tag);

  Object.entries(attrs)
    .forEach(
      ([key, value]) => {
        if (value == null) {
          return;
        }

        if (key === 'className') {
          node.className =
            String(value);

          return;
        }

        if (key === 'text') {
          node.textContent =
            String(value);

          return;
        }

        if (
          key.startsWith('on') &&
          typeof value === 'function'
        ) {
          node.addEventListener(
            key.slice(2).toLowerCase(),
            value
          );

          return;
        }

        if (
          BOOLEAN_PROPERTIES.has(key)
        ) {
          node[key] =
            Boolean(value);

          return;
        }

        if (
          key === 'value' &&
          'value' in node
        ) {
          node.value =
            String(value);

          return;
        }

        node.setAttribute(
          key,
          String(value)
        );
      }
    );

  const list =
    Array.isArray(children)
      ? children.flat(Infinity)
      : [children];

  list
    .filter(
      child =>
        child !== null &&
        child !== undefined &&
        child !== false
    )
    .forEach(
      child => {
        node.append(
          child?.nodeType
            ? child
            : document.createTextNode(
                String(child)
              )
        );
      }
    );

  return node;
}

export function replaceChildren(
  target,
  children = []
) {
  if (!target) {
    return;
  }

  const list =
    Array.isArray(children)
      ? children.flat(Infinity)
      : [children];

  target.replaceChildren(
    ...list.filter(
      child =>
        child !== null &&
        child !== undefined &&
        child !== false
    )
  );
}
