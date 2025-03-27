import prisma from './prisma';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    // Kiểm tra xem user admin đã tồn tại chưa
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash('admin123', 10); // Mật khẩu mặc định: admin123

      // Tạo user admin
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
        },
      });
      console.log('User admin created successfully');
    } else {
      console.log('User admin already exists');
    }
  } catch (error) {
    console.error('Error seeding user admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();