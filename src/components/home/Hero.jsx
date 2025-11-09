import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '@iconify/react';

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  useGSAP(() => {
    ScrollTrigger.defaults({
      toggleActions: 'play none none reverse',
    });

    gsap.to('#img-container', {
      scale: 52,
      ease: 'ease',
      scrollTrigger: {
        trigger: '#video-section',
        scrub: 1,
        start: 'top top',
        end: 'bottom',
        pin: true,
      },
    });

    gsap.to('.right', {
      autoAlpha: 0,
      x: 500,
      duration: 1.5,
      scrollTrigger: {
        start: 1,
      },
    });

    gsap.to('.left', {
      autoAlpha: 0,
      x: -500,
      duration: 1.5,
      scrollTrigger: {
        start: 1,
      },
    });

    gsap.to('#txt-bottom', {
      autoAlpha: 0,
      letterSpacing: -10,
      duration: 2,
      scrollTrigger: {
        start: 2,
      },
    });

    const tl = gsap.timeline();

    tl.from('#left-side div', {
      y: 150,
      opacity: 0,
      stagger: {
        amount: 0.4,
      },
      delay: 0.5,
    }).from('#right-side', { opacity: 0, duration: 2 }, 0.5);
    // .to('#wrapper', { x: -window.innerWidth });

    ScrollTrigger.create({
      animation: tl,
      trigger: '#wrapper',
      start: 'top top',
      end: '+=600',
      scrub: 1,
      pin: true,
      ease: 'ease',
    });

    const timeline = gsap.timeline();

    timeline
      .from('.hero-title span', {
        y: 150,
        skewY: 7,
        duration: 3,
      })
      .from('#txt-bottom', {
        letterSpacing: -10,
        opacity: 0,
        duration: 3,
      });
  });

  return (
    <div id="wrapper" className="flex">
      <section
        id="video-section"
        className="w-screen h-screen object-cover z-[-2] relative"
      >
        <div>
          <img
            className="w-screen h-screen object-cover z-[-2] relative"
            src="images/home/scene.jpg"
            alt=""
          />
        </div>
        <div id="img-container" className="absolute top-0 w-screen h-screen">
          <img
            className="object-cover w-full h-full"
            src="images/home/window.png"
            alt=""
          />
        </div>

        <div className="absolute top-0 w-screen h-screen flex flex-col items-center justify-center">
          <div>
            <div className="hero-title left text-[100px] left-[-25%]">
              <span>Wander</span>
            </div>
            <div className="hero-title left text-[65px] h-[40px] left-[-25%]">
              <span>off</span>
            </div>
            <div className="hero-title right text-[65px] top-[70px] left-[55%] z-[-1]">
              <span>the</span>
            </div>
            <div className="hero-title !h-[130px] right text-[100px] top-[0px] left-[55%]">
              <span>Map</span>
            </div>
          </div>

          <p
            id="txt-bottom"
            className="px-4 uppercase transform-[translateY(85px)] text-s tracking-[0.5rem] font-light text-center"
          >
            Exploring forgotten places, untold stories, and the beauty of being
            off the map
          </p>
        </div>

        <div className="absolute top-0 w-screen h-screen grid grid-cols-[2fr 1fr]">
          {/* <div id="left-side" className="flex flex-col justify-end p-16 gap-20">
            <div className="flex capitalize font-display">
              <div className="text-[100px]">push</div>
              <div className="text-[65px] h-[40px]">the</div>
              <div className="text-[100px] transform-[translateY(70px)]">
                envelope
              </div>
            </div>
            <div className="w-[260px]">
              <p className="pb-4 leading-[1.4] opacity-80">
                Photography has become a big part of almost every element of our
                lives.
              </p>
              <p className="pb-4 leading-[1.4] opacity-80">
                It become widespread and diverse but we know that this is still
                a real form of art and magic.
              </p>
            </div>
          </div> */}
          <div
            id="right-side"
            className="m-auto w-[150px] h-[150px] border-t-2 border-t-solid border-b-2 border-b-solid border-white/60 rounded-full relative flex flex-col items-center justify-center"
          >
            <p>
              <a href="mailto:dave@slightlylost.com">
                say hello{' '}
                <Icon
                  className="transform-[translateX(20px)]"
                  icon="mdi-light:email"
                />
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hero;
