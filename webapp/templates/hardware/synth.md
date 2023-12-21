+++
css: schematic.css
+++

# XDB-333 Analog Bass Synthesizer

Open-source sound synthesis built from the ground up. Minimalist hardware and software design. Network spirit in the frequency domain. These are the aspirations of the XDB-333, a 303-inspired analog bass synth designed with the hacker in mind.

A repository with full design files is available at [/git/synth](/git/synth). Schematic capture and layout are done in the free and open-source [KiCad EDA](https://www.kicad.org/).

## Schematic Breakdown

### MCU, Power, and LFO

<html></div><div class="sch-container">
<object type="image/svg+xml" data="/static/img/synth/synth.svg"></object>
</div><div class="container"></html>

An ATmega16 interfaces with the MIDI interface via an optocoupler. The ATmega receives MIDI messages on its USART interface and translates them to an analog frequency control voltage, generated using an external 8-bit R2R DAC. The frequency control signal is fed to the oscillator circuit, while a digital trigger output is fed to the envelope generator. An AD9833 is programmed over SPI to generate a sine, square, or triangle wave LFO, and a toggle switch can also be used to select an arbitrary waveform LFO created by low-pass filtering a PWM output of the ATmega.

+12V is supplied by a barrel jack, while -12V is generated using a charge pump switched by a 555 timer. A buck regulator fed by the +12V rail outputs 5V, while an LDO fed by the 5V rail outputs 3.3V.

### Exponential VCO

<html></div><div class="sch-container">
<object type="image/svg+xml" data="/static/img/synth/osc.svg"></object>
</div><div class="container"></html>

The voltage-controlled oscillator consists of a linear-to-exponential voltage converter and a linear V-to-F converter implemented with the LM331. If the control voltage from the DAC were fed directly to the V-to-F converter without exponentiation, the output frequency would be out of tune at low frequencies due to the limited resolution of the 8-bit DAC and the exponential nature of the musical scale.

A summing amplifier adds the control voltage with the LFO voltage and a user-controlled tuning voltage. The amplifier output drives the base of an NPN transistor. An op amp draws a constant current through a resistor into the collector of the left BJT. In this configuration, since the current through the left transistor is fixed, variation of its base voltage will cause the common emitter voltage to follow suit, while the right transistor (having its base fixed at ground) will conduct a current exponentially related to the change in the emitter voltage and therefore the original Vbe of the left transistor. The advantage of using a pair of transistors is that their leakage currents, which are highly temperature-dependent, cancel out and avoid the tuning changing with temperature. In this case the two BJTs share a die, further ensuring they remain at the same temperature.

The exponentially-varying current is converted to a voltage using an opamp, and then fed into the comparator input of an LM331 V-to-F converter with passive components selected to produce an output frequency with maximum resolution over the desired range. The LM331 open-drain output is pulled up to 5V, producing a square wave from 0 to 5V, which is shifted to center at 0V by a DC blocking cap.

### ADSR Envelope Generator

<html></div><div class="sch-container">
<object type="image/svg+xml" data="/static/img/synth/env-gen.svg"></object>
</div><div class="container"></html>

Whenever a note is triggered, an ADSR envelope is generated with user-adjustable parameters. Op amps convert the 3.3V TRIG input to a 12V TRIG signal and its complement, NTRIG. When a note is triggered a PNP allows a capacitor to charge with adjustable RC time constant to produce a rising attack edge---not truly linear but it does not matter in this case. When the charging reaches 5V, a RS latch is set and discharging begins thorugh a different varistor which configures decay time. The attack-decay waveform is composited with a sustain-release waveform (pulse with an RC-configurable tail) using two diodes to effectively take their maximum. Another transistor is used to pull down the sustain-release waveform during attack charging to prevent it from overlapping the attack, and a fourth transistor cuts the attack-decay waveform short if TRIG is released before the decay finishes.

### VCA Mixer

<html></div><div class="sch-container">
<object type="image/svg+xml" data="/static/img/synth/vca.svg"></object>
</div><div class="container"></html>

Finally, it is necessary to multiply the envelope and oscillator outputs to obtain the audio waveform. This is accomplished using a modified version of a Gilbert cell, where the envelope input controls the common emitter current of a pair of BJTs in a differential amplifier configuration, and the oscillator input controls one side of the differential input. The differential output of that amplifier is then converted to single-ended with an op amp, the audio level scaled by a second op amp in an inverting amplifier configuration with user-adjustable gain, and a large capacitor used to block DC (largely for protection since any DC bias on the output will be minimal). A large capacitance is necessary here to ensure a sufficiently low cutoff frequency, since the impedance of the next stage (headphones or audio amp input) is unknown and may be small (50 ohms or less).

## Layout

WIP

## Software

Software will be written in C and compiled for the AVR with `avr-gcc`. Program binaries will be flashed with `avrdude` to the ATmega internal flash using the synth's JTAG connector
