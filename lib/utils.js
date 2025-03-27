import jwt from 'jsonwebtoken';

export async function getConfig() {
  const response = await fetch('/api/config');
  const config = await response.json();
  return config;
}

export function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}