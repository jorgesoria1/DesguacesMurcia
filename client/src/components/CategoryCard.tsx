import React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  title: string;
  href: string;
  icon: LucideIcon;
  className?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  href,
  icon: Icon,
  className,
}) => {
  return (
    <div className={cn(
      "bg-white p-4 rounded-lg shadow-md text-center transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg block cursor-pointer", 
      className
    )}>
      <Link href={href} className="block">
        <div className="text-primary text-3xl mb-2 flex justify-center">
          <Icon size={36} />
        </div>
        <h3 className="font-montserrat font-medium">{title}</h3>
      </Link>
    </div>
  );
};

export default CategoryCard;
