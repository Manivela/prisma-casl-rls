import { AbilityBuilder, PureAbility } from "@casl/ability";
import { PrismaQuery, Subjects, createPrismaAbility } from "@casl/prisma";
import { User, Post } from "@prisma/client";

export type AppAbility = PureAbility<
  [
    string,
    (
      | "all"
      | Subjects<{
          User: User;
          Post: Post;
        }>
    )
  ],
  PrismaQuery
>;

let ANONYMOUS_ABILITY: AppAbility;
export function defineAbilityFor(user?: User | null) {
  if (user) return createPrismaAbility(defineRulesFor(user));

  ANONYMOUS_ABILITY =
    ANONYMOUS_ABILITY || createPrismaAbility(defineRulesFor());
  return ANONYMOUS_ABILITY;
}

export function defineRulesFor(user?: User) {
  const builder = new AbilityBuilder<AppAbility>(createPrismaAbility);
  switch (user?.role) {
    case "ADMIN":
      defineAdminRules(builder);
    case "USER":
      defineUserRules(builder, user);
    default:
      defineAnonymousRules(builder);
      break;
  }

  return builder.rules;
}

function defineAdminRules({ can }: AbilityBuilder<AppAbility>) {
  can(["read", "create", "delete", "update"], ["all"]);
}

function defineUserRules({ can }: AbilityBuilder<AppAbility>, user: User) {
  can(["read", "update"], "User", { id: user.id });
  can(["read", "create", "delete", "update"], "Post", { authorId: user.id });
}

function defineAnonymousRules({ can }: AbilityBuilder<AppAbility>) {
  can("read", "Post", { published: true });
}
