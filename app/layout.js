import "./globals.css";

export const metadata = {
  title: "Sana | Meal Tracker",
  description: "Track meals by category and weight.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
