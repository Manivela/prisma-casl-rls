import { PrismaClient } from "@prisma/client";
import { createPermissionExtensionFor } from "./extension";
import assert from "assert";

const prisma = new PrismaClient();

async function main() {
  // reset everything
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@prisma.io",
      role: "ADMIN",
    },
  });
  const alice = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@prisma.io",
    },
  });
  const bob = await prisma.user.create({
    data: {
      name: "Bob",
      email: "bob@prisma.io",
    },
  });
  const alicePost = await prisma.post.create({
    data: {
      title: "Alice's published post",
      authorId: alice.id,
      published: true,
    },
  });
  const aliceDraftPost = await prisma.post.create({
    data: {
      title: "Alice's draft post",
      authorId: alice.id,
      published: false,
    },
  });
  const bobPost = await prisma.post.create({
    data: {
      title: "Bobs post",
      authorId: bob.id,
      published: false,
    },
  });
  const adminPrisma = prisma.$extends(createPermissionExtensionFor(admin));
  const alicePrisma = prisma.$extends(createPermissionExtensionFor(alice));
  const bobPrisma = prisma.$extends(createPermissionExtensionFor(bob));
  const anonymousPrisma = prisma.$extends(createPermissionExtensionFor());
  // alice shouldn't have access to bobs post
  assert.rejects(alicePrisma.post.findUnique({ where: { id: bobPost.id } }));
  // bob should have access to his post
  assert.doesNotReject(
    bobPrisma.post.findUnique({ where: { id: bobPost.id } })
  );
  // anyone can access published posts but can't access unpublished posts
  assert.doesNotReject(
    anonymousPrisma.post.findUnique({ where: { id: alicePost.id } })
  );
  assert.rejects(
    anonymousPrisma.post.findUnique({ where: { id: bobPost.id } })
  );
  // get all of bobs posts using the Fluent API
  assert.doesNotReject(
    bobPrisma.user.findUnique({ where: { id: bob.id } }).posts({})
  );
  // alice shouldn't see bobs post when listing all posts
  alicePrisma.post
    .findMany()
    .then((posts) => assert(!posts.some((post) => post.id === bobPost.id)));
  // bob should see alice's post since its published
  bobPrisma.post
    .findMany()
    .then((posts) => assert(posts.some((post) => post.id === alicePost.id)));
  // admin should see all posts
  adminPrisma.post
    .findMany()
    .then((posts) =>
      assert(
        posts.every((post) =>
          [bobPost.id, alicePost.id, aliceDraftPost.id].includes(post.id)
        )
      )
    );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
