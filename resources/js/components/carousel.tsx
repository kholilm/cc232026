import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Carousel() {
    const slides = [
        {
            image: '/images/karyawan1.png',
            title: '',
            desc: '',
            button: '',
        },
        {
            image: '/images/karyawan2.png',
            title: '',
            desc: '',
            button: '',
        },
        {
            image: '/images/karyawan3.png',
            title: '',
            desc: '',
            button: '',
        },
        {
            image: '/images/caraousel5.png',
            title: 'Produktivitas Tim',
            desc: 'Tingkatkan performa dengan monitoring real-time',
            button: 'Mulai Sekarang',
        },
    ];

    const [current, setCurrent] = useState(0);

    // 🔥 AUTO SLIDE
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const prevSlide = () => {
        setCurrent(current === 0 ? slides.length - 1 : current - 1);
    };

    const nextSlide = () => {
        setCurrent(current === slides.length - 1 ? 0 : current + 1);
    };

    return (
        <div className="relative h-45 w-full overflow-hidden rounded-2xl shadow md:h-55">
            {/* 🔥 SLIDE */}
            <div
                className="flex transition-transform duration-700"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {slides.map((slide, i) => (
                    <div key={i} className="relative w-full shrink-0">
                        {/* IMAGE */}
                        <img
                            src={slide.image}
                            className="h-55 w-full object-cover object-center"
                        />

                        {/* 🔥 OVERLAY GELAP */}
                        <div className="absolute inset-0 bg-black/10"></div>

                        {/* 🔥 TEXT CONTENT */}
                        <div className="absolute inset-0 flex flex-col justify-center px-6 text-white md:px-10">
                            <h2 className="text-lg font-bold md:text-2xl">
                                {slide.title}
                            </h2>
                            <p className="mt-1 text-xs opacity-90 md:text-sm">
                                {slide.desc}
                            </p>

                            <button className="mt-3 w-fit rounded-md bg-yellow-400 px-4 py-1.5 text-xs text-black transition hover:bg-yellow-300 md:text-sm">
                                {slide.button}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 🔥 BUTTON NAV */}
            <button
                onClick={prevSlide}
                className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
                <ChevronLeft size={20} />
            </button>

            <button
                onClick={nextSlide}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
            >
                <ChevronRight size={20} />
            </button>

            {/* 🔥 INDICATOR */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((_, i) => (
                    <div
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-2.5 w-2.5 cursor-pointer rounded-full ${
                            current === i ? 'bg-yellow-400' : 'bg-white/40'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
