import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "student@udlms.local" },
    update: {},
    create: { name: "Jordan Davies", email: "student@udlms.local", passwordHash, role: Role.STUDENT }
  });

  await prisma.user.upsert({
    where: { email: "librarian@udlms.local" },
    update: {},
    create: { name: "Sarah Mitchell", email: "librarian@udlms.local", passwordHash, role: Role.LIBRARIAN }
  });

  await prisma.user.upsert({
    where: { email: "admin@udlms.local" },
    update: {},
    create: { name: "Admin User", email: "admin@udlms.local", passwordHash, role: Role.ADMIN }
  });

  await prisma.policy.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, loanDays: 14, maxRenewals: 2, finePerDayCents: 50, holdDays: 7 }
  });

  const items = [
    {
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "978-0-13-235088-4",
      subject: "Computer Science",
      resourceType: "Book",
      year: 2008,
      totalCopies: 3,
      available: 1
    },
    {
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      isbn: "978-1-4919-0310-7",
      subject: "Computer Science",
      resourceType: "Book",
      year: 2017,
      totalCopies: 4,
      available: 2
    },
    {
      title: "System Design Interview",
      author: "Alex Xu",
      isbn: "978-1-7364-2510-5",
      subject: "Computer Science",
      resourceType: "Book",
      year: 2020,
      totalCopies: 2,
      available: 0
    },
    {
      title: "Database System Concepts",
      author: "Silberschatz and Korth",
      isbn: "978-0-07-802215-9",
      subject: "Computer Science",
      resourceType: "Book",
      year: 2019,
      totalCopies: 5,
      available: 5
    }
  ];

  for (const item of items) {
    await prisma.catalogItem.upsert({
      where: { isbn: item.isbn },
      update: item,
      create: item
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
