"use client";

import { Children } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function Slider({ children, arrows }: { children: React.ReactNode; arrows: boolean }) {
  return (
    <Carousel opts={{ align: "start" }} className="w-full">
      <CarouselContent>
        {Children.map(children, (child) => (
          <CarouselItem className="basis-1/2 sm:basis-1/3 lg:basis-1/4">{child}</CarouselItem>
        ))}
      </CarouselContent>
      {arrows && (
        <>
          <CarouselPrevious className="hidden lg:inline-flex" />
          <CarouselNext className="hidden lg:inline-flex" />
        </>
      )}
    </Carousel>
  );
}
