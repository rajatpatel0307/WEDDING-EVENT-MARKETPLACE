import { GraphQLError, Kind } from "graphql";
// Count expanded selections so fragments cannot bypass mutation or depth limits.
export function securityValidation(context) {
  return {
    OperationDefinition(operation) {
      let fields = 0,
        topLevel = 0,
        rejected = false;
      function walk(selectionSet, depth, stack = new Set()) {
        for (const selection of selectionSet.selections) {
          if (rejected) return;
          if (selection.kind === Kind.FIELD) {
            fields++;
            if (depth === 1) topLevel++;
            if (
              fields > 150 ||
              depth > 8 ||
              (operation.operation === "mutation" && topLevel > 1)
            ) {
              rejected = true;
              context.reportError(
                new GraphQLError(
                  "Send one mutation per request and keep query complexity within limits.",
                ),
              );
              return;
            }
            if (selection.selectionSet)
              walk(selection.selectionSet, depth + 1, stack);
          } else if (selection.kind === Kind.INLINE_FRAGMENT) {
            walk(selection.selectionSet, depth, stack);
          } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const name = selection.name.value;
            if (stack.has(name)) continue;
            const fragment = context.getFragment(name);
            if (fragment)
              walk(fragment.selectionSet, depth, new Set([...stack, name]));
          }
        }
      }
      walk(operation.selectionSet, 1);
    },
  };
}
