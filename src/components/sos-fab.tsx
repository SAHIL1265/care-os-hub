import { Link } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { motion } from "framer-motion";

export function SosFab() {
  return (
    <Link
      to="/emergency"
      className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-elegant shadow-glow"
      aria-label="Emergency SOS"
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-destructive/50"
        animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      <Siren className="relative h-6 w-6" />
    </Link>
  );
}
