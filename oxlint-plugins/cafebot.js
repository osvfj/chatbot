const isUnknownType = (node) => node?.type === "TSUnknownKeyword";
const isAnyType = (node) => node?.type === "TSAnyKeyword";
const isStringType = (node) =>
  node?.type === "TSStringKeyword" ||
  (node?.type === "TSLiteralType" &&
    node.literal?.type === "StringLiteral" &&
    node.literal.value === "string");

const noRecordStringUnknown = {
  create(context) {
    return {
      TSTypeReference(node) {
        const name = node.typeName?.type === "Identifier" ? node.typeName.name : null;
        if (name !== "Record") {
          return;
        }
        const [first, second] = node.typeParameters?.params ?? [];
        if (isStringType(first) && (isUnknownType(second) || isAnyType(second))) {
          context.report({
            node,
            message:
              "Evita Record<string, unknown>: define un tipo explícito (interfaz o Schema.Struct).",
          });
        }
      },
      TSIndexSignature(node) {
        if (isUnknownType(node.typeAnnotation) || isAnyType(node.typeAnnotation)) {
          context.report({
            node,
            message: "Evita index signatures con unknown/any: define un tipo explícito.",
          });
        }
      },
    };
  },
};

const noUnknownAssertions = {
  create(context) {
    return {
      TSAsExpression(node) {
        const annotation = node.typeAnnotation;
        if (isUnknownType(annotation) || isAnyType(annotation)) {
          context.report({
            node,
            message:
              "Prohibido: casts hacia/desde unknown o any (as unknown, as any, as unknown as X).",
          });
        }
      },
    };
  },
};

const noTypeofGuards = {
  create(context) {
    const check = (node) => {
      for (const side of [node.left, node.right]) {
        if (side?.type === "UnaryExpression" && side.operator === "typeof") {
          context.report({
            node,
            message:
              "Evita comparaciones con typeof: usa predicados de Effect (Predicate, Option, Schema).",
          });
          return;
        }
      }
    };
    return {
      BinaryExpression: check,
      LogicalExpression: check,
    };
  },
};

export default {
  meta: {
    name: "cafebot",
  },
  rules: {
    "no-record-string-unknown": noRecordStringUnknown,
    "no-unknown-assertions": noUnknownAssertions,
    "no-typeof-guards": noTypeofGuards,
  },
};
