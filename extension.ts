import { PureAbility, subject } from "@casl/ability";
import { defineAbilityFor } from "./casl";
import { Prisma, User } from "@prisma/client";
import { PrismaQuery, accessibleBy } from "@casl/prisma";
import {
  DynamicQueryExtensionCbArgs,
  InternalArgs,
  DefaultArgs,
} from "@prisma/client/runtime/library";

const handleFindUnique = async (
  ability: PureAbility<any, PrismaQuery>,
  {
    model,
    args,
    query,
  }: DynamicQueryExtensionCbArgs<
    Prisma.TypeMap<InternalArgs & DefaultArgs>,
    "model",
    "User" | "Post",
    "findUnique" | "findUniqueOrThrow"
  >
) => {
  const result = await query(args);

  const checkPerm = (result: any) => {
    // use the modelName defined in the object first to prevent mismatch in the Fluent API
    const prismaModel = result.modelName || model;
    const sbj = subject(prismaModel, result);
    if (!ability.can("read", sbj)) {
      //   console.log("denied:", prismaModel, result);
      throw new Error("Permission Denied!");
    }
    // console.log("allowed:", prismaModel, result);
  };
  if (result) {
    if (Array.isArray(result)) {
      result.map((r) => checkPerm(r));
    } else {
      checkPerm(result);
    }
  }
  return result;
};

const handleFindWhere = async (
  ability: PureAbility<any, PrismaQuery>,
  {
    model,
    args,
    query,
  }: DynamicQueryExtensionCbArgs<
    Prisma.TypeMap<InternalArgs & DefaultArgs>,
    "model",
    "User" | "Post",
    "findMany" | "findFirst" | "findFirstOrThrow"
  >
) => {
  if (args.where) {
    if (Array.isArray(args.where)) {
      args.where = {
        AND: [accessibleBy(ability)[model], ...args.where],
      };
    } else {
      args.where = {
        AND: [accessibleBy(ability)[model], args.where],
      } as any;
    }
  } else {
    args.where = accessibleBy(ability)[model];
  }
  return query(args);
};

export const createPermissionExtensionFor = (user?: User | null) => {
  const ability = defineAbilityFor(user);
  return Prisma.defineExtension((client) => {
    return client.$extends({
      query: {
        $allModels: {
          async findUnique(args) {
            return handleFindUnique(ability, args);
          },
          async findUniqueOrThrow(args) {
            return handleFindUnique(ability, args);
          },
          async findMany(args) {
            return handleFindWhere(ability, args);
          },
          async findFirst(args) {
            return handleFindWhere(ability, args);
          },
          async findFirstOrThrow(args) {
            return handleFindWhere(ability, args);
          },
        },
      },
    });
  });
};
