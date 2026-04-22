import React from 'react';
import Atropos from 'atropos/react';

const isDesktopHoverDevice = () => {
    if (typeof window === 'undefined') return false;

    const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    return !reduceMotion && canHover && finePointer;
};

const ParallaxHoverCard = ({ children, className = '' }) => {
    if (!isDesktopHoverDevice()) {
        return <div className={className}>{children}</div>;
    }

    return (
        <Atropos
            className={className}
            activeOffset={32}
            rotateTouch="scroll-y"
            duration={420}
            shadow
            highlight
            rotateXMax={9}
            rotateYMax={9}
        >
            <div data-atropos-offset="4">{children}</div>
        </Atropos>
    );
};

export default ParallaxHoverCard;
