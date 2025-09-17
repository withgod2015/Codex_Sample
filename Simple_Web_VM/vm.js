(() => {
    const REGISTER_COUNT = 4;
    const MEMORY_SIZE = 128;
    const MAX_CYCLES = 4096;

    const CHAR_ESCAPES = {
        n: "\n",
        r: "\r",
        t: "\t",
        "\\": "\\",
        "'": "'",
        '"': '"'
    };

    const SAMPLE_PROGRAM = `; Prints HELLO! and a newline
start:
    LOAD r0, 'H'
    WRITE r0
    LOAD r0, 'E'
    WRITE r0
    LOAD r0, 'L'
    WRITE r0
    LOAD r0, 'L'
    WRITE r0
    LOAD r0, 'O'
    WRITE r0
    LOAD r0, '!'
    WRITE r0
    LOAD r0, '\n'
    WRITE r0
    HALT`;

    class SimpleVM {
        constructor() {
            this.registerCount = REGISTER_COUNT;
            this.memorySize = MEMORY_SIZE;
            this.maxCycles = MAX_CYCLES;
            this.program = [];
            this.labels = new Map();
            this.memory = new Int32Array(this.memorySize);
            this.registers = new Int32Array(this.registerCount);
            this.flags = { zero: false, negative: false };
            this.pc = 0;
            this.halted = false;
            this.cycleCount = 0;
            this.inputBuffer = [];
            this.inputPointer = 0;
            this.outputBuffer = [];
        }

        resetState({ clearMemory = false } = {}) {
            this.registers.fill(0);
            if (clearMemory) {
                this.memory.fill(0);
            }
            this.flags.zero = false;
            this.flags.negative = false;
            this.pc = 0;
            this.halted = false;
            this.cycleCount = 0;
            this.inputPointer = 0;
            this.clearOutput();
        }

        clearOutput() {
            this.outputBuffer = [];
        }

        loadProgram(source) {
            const { instructions, labels } = this.parseProgram(source);
            this.program = instructions;
            this.labels = labels;
            this.resetState({ clearMemory: true });
        }

        parseProgram(source) {
            const lines = source.split(/\r?\n/);
            const instructions = [];
            const labels = new Map();

            const stripComments = (line) => {
                let inQuote = false;
                let quoteChar = null;
                for (let i = 0; i < line.length; i += 1) {
                    const ch = line[i];
                    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
                        if (!inQuote) {
                            inQuote = true;
                            quoteChar = ch;
                        } else if (quoteChar === ch) {
                            inQuote = false;
                            quoteChar = null;
                        }
                    }
                    if (!inQuote && (ch === ';' || ch === '#')) {
                        return line.slice(0, i);
                    }
                }
                return line;
            };

            lines.forEach((rawLine, index) => {
                const withoutComments = stripComments(rawLine);
                const trimmed = withoutComments.trim();
                if (!trimmed.length) {
                    return;
                }

                const labelMatch = trimmed.match(/^([A-Za-z_][\w]*):/);
                let remainder = trimmed;
                if (labelMatch) {
                    const label = labelMatch[1];
                    if (labels.has(label)) {
                        throw new Error(`Duplicate label '${label}' on line ${index + 1}.`);
                    }
                    labels.set(label, instructions.length);
                    remainder = trimmed.slice(labelMatch[0].length).trim();
                    if (!remainder.length) {
                        return;
                    }
                }

                const parts = remainder.split(/\s+/);
                if (!parts.length) {
                    return;
                }

                const opcode = parts.shift().toUpperCase();
                const operandText = parts.join(' ').trim();
                const operands = operandText.length
                    ? operandText.split(',').map((part) => part.trim()).filter(Boolean)
                    : [];

                instructions.push({
                    opcode,
                    operands,
                    lineNumber: index + 1,
                    raw: rawLine
                });
            });

            return { instructions, labels };
        }

        setInput(text = '') {
            this.inputBuffer = Array.from(text).map((ch) => ch.codePointAt(0));
            this.inputPointer = 0;
        }

        getOutput() {
            return this.outputBuffer.map((code) => String.fromCodePoint(code)).join('');
        }

        assertProgramLoaded() {
            if (!this.program.length) {
                throw new Error('No program loaded.');
            }
        }

        step() {
            this.assertProgramLoaded();
            if (this.halted) {
                return { halted: true };
            }
            if (this.pc < 0 || this.pc >= this.program.length) {
                this.halted = true;
                throw new Error(`Program counter out of bounds (${this.pc}).`);
            }

            const instruction = this.program[this.pc];
            let nextPC = this.pc + 1;

            const expectRegister = (token) => {
                const match = token.match(/^r(\d+)$/i);
                if (!match) {
                    throw new Error(`Expected register operand on line ${instruction.lineNumber}, got '${token}'.`);
                }
                const index = Number(match[1]);
                if (Number.isNaN(index) || index < 0 || index >= this.registerCount) {
                    throw new Error(`Register index out of range on line ${instruction.lineNumber}: '${token}'.`);
                }
                return index;
            };

            const parseNumber = (token) => {
                if (/^0x[0-9a-f]+$/i.test(token)) {
                    return Number.parseInt(token, 16);
                }
                if (/^0b[01]+$/i.test(token)) {
                    return Number.parseInt(token.slice(2), 2);
                }
                const value = Number(token);
                if (Number.isNaN(value)) {
                    throw new Error(`Invalid numeric literal '${token}' on line ${instruction.lineNumber}.`);
                }
                return value;
            };

            const parseCharLiteral = (token) => {
                const body = token.slice(1, -1);
                if (!body.length) {
                    throw new Error(`Empty character literal on line ${instruction.lineNumber}.`);
                }
                if (body.length === 1) {
                    return body.codePointAt(0);
                }
                if (body.length === 2 && body[0] === '\\') {
                    const escape = CHAR_ESCAPES[body[1]];
                    if (escape === undefined) {
                        throw new Error(`Unknown escape sequence '${body}' on line ${instruction.lineNumber}.`);
                    }
                    return escape.codePointAt(0);
                }
                throw new Error(`Too many characters in literal '${token}' on line ${instruction.lineNumber}.`);
            };

            const resolveOperand = (token, options = {}) => {
                const config = {
                    allowRegister: true,
                    allowImmediate: true,
                    allowMemory: false,
                    allowLabel: false,
                    ...options
                };

                if (config.allowRegister && /^r\d+$/i.test(token)) {
                    return { kind: 'register', index: expectRegister(token) };
                }

                if (config.allowMemory && token.startsWith('@')) {
                    const addrToken = token.slice(1);
                    if (!addrToken.length) {
                        throw new Error(`Missing address in memory operand on line ${instruction.lineNumber}.`);
                    }
                    if (!/^\d+$/.test(addrToken)) {
                        throw new Error(`Only numeric memory addresses are supported on line ${instruction.lineNumber}.`);
                    }
                    const address = Number(addrToken);
                    if (address < 0 || address >= this.memorySize) {
                        throw new Error(`Memory address out of bounds (${address}) on line ${instruction.lineNumber}.`);
                    }
                    return { kind: 'memory', address };
                }

                if (config.allowLabel && /^[A-Za-z_][\w]*$/.test(token)) {
                    return { kind: 'label', name: token };
                }

                if (config.allowImmediate && ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"')))) {
                    return { kind: 'immediate', value: parseCharLiteral(token) };
                }

                if (config.allowImmediate) {
                    return { kind: 'immediate', value: parseNumber(token) };
                }

                throw new Error(`Unexpected operand '${token}' on line ${instruction.lineNumber}.`);
            };

            const readRegister = (index) => this.registers[index];
            const writeRegister = (index, value) => {
                const numeric = Number(value);
                this.registers[index] = numeric;
                this.flags.zero = numeric === 0;
                this.flags.negative = numeric < 0;
            };

            const getImmediateLike = (operand) => {
                if (operand.kind === 'immediate') {
                    return operand.value;
                }
                if (operand.kind === 'register') {
                    return readRegister(operand.index);
                }
                throw new Error(`Operand '${operand.kind}' not allowed here on line ${instruction.lineNumber}.`);
            };

            const jumpTo = (operand) => {
                if (operand.kind !== 'label') {
                    throw new Error(`Expected label operand on line ${instruction.lineNumber}.`);
                }
                if (!this.labels.has(operand.name)) {
                    throw new Error(`Unknown label '${operand.name}' on line ${instruction.lineNumber}.`);
                }
                nextPC = this.labels.get(operand.name);
            };

            switch (instruction.opcode) {
                case 'LOAD': {
                    if (instruction.operands.length !== 2) {
                        throw new Error(`LOAD expects 2 operands on line ${instruction.lineNumber}.`);
                    }
                    const dest = resolveOperand(instruction.operands[0]);
                    const source = resolveOperand(instruction.operands[1], { allowMemory: true });
                    if (dest.kind !== 'register') {
                        throw new Error(`LOAD destination must be a register (line ${instruction.lineNumber}).`);
                    }
                    let value;
                    if (source.kind === 'register') {
                        value = readRegister(source.index);
                    } else if (source.kind === 'memory') {
                        value = this.memory[source.address];
                    } else {
                        value = source.value;
                    }
                    writeRegister(dest.index, value);
                    break;
                }
                case 'STORE': {
                    if (instruction.operands.length !== 2) {
                        throw new Error(`STORE expects 2 operands on line ${instruction.lineNumber}.`);
                    }
                    const src = resolveOperand(instruction.operands[0]);
                    const target = resolveOperand(instruction.operands[1], { allowMemory: true, allowImmediate: false, allowRegister: false });
                    if (src.kind !== 'register' || target.kind !== 'memory') {
                        throw new Error(`STORE syntax is STORE rX, @addr (line ${instruction.lineNumber}).`);
                    }
                    this.memory[target.address] = readRegister(src.index) & 0xff;
                    break;
                }
                case 'ADD':
                case 'SUB': {
                    if (instruction.operands.length !== 2) {
                        throw new Error(`${instruction.opcode} expects 2 operands on line ${instruction.lineNumber}.`);
                    }
                    const dest = resolveOperand(instruction.operands[0], { allowMemory: false, allowLabel: false });
                    const rhs = resolveOperand(instruction.operands[1], { allowMemory: false, allowLabel: false });
                    if (dest.kind !== 'register' || rhs.kind !== 'register') {
                        throw new Error(`${instruction.opcode} operands must be registers (line ${instruction.lineNumber}).`);
                    }
                    const leftValue = readRegister(dest.index);
                    const rightValue = readRegister(rhs.index);
                    const result = instruction.opcode === 'ADD'
                        ? leftValue + rightValue
                        : leftValue - rightValue;
                    writeRegister(dest.index, result);
                    break;
                }
                case 'INC':
                case 'DEC': {
                    if (instruction.operands.length !== 1) {
                        throw new Error(`${instruction.opcode} expects 1 operand on line ${instruction.lineNumber}.`);
                    }
                    const target = resolveOperand(instruction.operands[0], { allowMemory: false, allowLabel: false });
                    if (target.kind !== 'register') {
                        throw new Error(`${instruction.opcode} operand must be a register (line ${instruction.lineNumber}).`);
                    }
                    const delta = instruction.opcode === 'INC' ? 1 : -1;
                    writeRegister(target.index, readRegister(target.index) + delta);
                    break;
                }
                case 'CMP': {
                    if (instruction.operands.length !== 2) {
                        throw new Error(`CMP expects 2 operands on line ${instruction.lineNumber}.`);
                    }
                    const left = resolveOperand(instruction.operands[0], { allowMemory: false, allowLabel: false });
                    const right = resolveOperand(instruction.operands[1], { allowMemory: false, allowLabel: false });
                    if (left.kind !== 'register') {
                        throw new Error(`CMP first operand must be a register (line ${instruction.lineNumber}).`);
                    }
                    const diff = readRegister(left.index) - getImmediateLike(right);
                    this.flags.zero = diff === 0;
                    this.flags.negative = diff < 0;
                    break;
                }
                case 'JMP':
                case 'JZ':
                case 'JNZ': {
                    if (instruction.operands.length !== 1) {
                        throw new Error(`${instruction.opcode} expects 1 operand on line ${instruction.lineNumber}.`);
                    }
                    const target = resolveOperand(instruction.operands[0], { allowLabel: true, allowImmediate: false, allowMemory: false });
                    if (instruction.opcode === 'JMP'
                        || (instruction.opcode === 'JZ' && this.flags.zero)
                        || (instruction.opcode === 'JNZ' && !this.flags.zero)) {
                        jumpTo(target);
                    }
                    break;
                }
                case 'READ': {
                    if (instruction.operands.length !== 1) {
                        throw new Error(`READ expects 1 operand on line ${instruction.lineNumber}.`);
                    }
                    const dest = resolveOperand(instruction.operands[0], { allowMemory: false, allowLabel: false });
                    if (dest.kind !== 'register') {
                        throw new Error(`READ operand must be a register (line ${instruction.lineNumber}).`);
                    }
                    let value = 0;
                    if (this.inputPointer < this.inputBuffer.length) {
                        value = this.inputBuffer[this.inputPointer];
                        this.inputPointer += 1;
                    }
                    writeRegister(dest.index, value);
                    break;
                }
                case 'WRITE': {
                    if (instruction.operands.length !== 1) {
                        throw new Error(`WRITE expects 1 operand on line ${instruction.lineNumber}.`);
                    }
                    const src = resolveOperand(instruction.operands[0], { allowMemory: false, allowLabel: false });
                    if (src.kind !== 'register') {
                        throw new Error(`WRITE operand must be a register (line ${instruction.lineNumber}).`);
                    }
                    const value = readRegister(src.index);
                    this.outputBuffer.push(value & 0xffff);
                    break;
                }
                case 'HALT': {
                    this.halted = true;
                    nextPC = this.pc;
                    break;
                }
                default:
                    throw new Error(`Unknown opcode '${instruction.opcode}' on line ${instruction.lineNumber}.`);
            }

            this.cycleCount += 1;
            if (this.cycleCount > this.maxCycles) {
                this.halted = true;
                throw new Error(`Cycle limit of ${this.maxCycles} exceeded.`);
            }

            this.pc = nextPC;
            return { halted: this.halted };
        }

        run() {
            let steps = 0;
            while (!this.halted) {
                this.step();
                steps += 1;
                if (steps > this.maxCycles) {
                    break;
                }
            }
            return { halted: this.halted, steps };
        }
    }

    const elements = {
        program: document.getElementById('program'),
        stdin: document.getElementById('stdin'),
        stdout: document.getElementById('stdout'),
        loadBtn: document.getElementById('loadBtn'),
        stepBtn: document.getElementById('stepBtn'),
        runBtn: document.getElementById('runBtn'),
        resetBtn: document.getElementById('resetBtn'),
        registerTable: document.getElementById('registerTable'),
        memoryTable: document.getElementById('memoryTable'),
        status: document.getElementById('status')
    };

    const vm = new SimpleVM();

    const setStatus = (message, tone = 'info') => {
        elements.status.textContent = message;
        elements.status.classList.remove('error', 'success');
        if (tone === 'error') {
            elements.status.classList.add('error');
        } else if (tone === 'success') {
            elements.status.classList.add('success');
        }
    };

    const renderRegisters = () => {
        const rows = [];
        rows.push('<tr><th>Register</th><th>Value</th></tr>');
        for (let i = 0; i < vm.registers.length; i += 1) {
            rows.push(`<tr><td>r${i}</td><td>${vm.registers[i]}</td></tr>`);
        }
        rows.push(`<tr><th>PC</th><td>${vm.pc}</td></tr>`);
        rows.push(`<tr><th>Flags</th><td>Z=${vm.flags.zero ? 1 : 0} | N=${vm.flags.negative ? 1 : 0}</td></tr>`);
        rows.push(`<tr><th>Status</th><td>${vm.halted ? 'HALTED' : 'READY'}</td></tr>`);
        elements.registerTable.innerHTML = rows.join('');
    };

    const renderMemory = () => {
        const columns = 8;
        const headerCells = ['<tr><th>Addr</th>'];
        for (let i = 0; i < columns; i += 1) {
            headerCells.push(`<th>+${i}</th>`);
        }
        headerCells.push('</tr>');
        const rows = [headerCells.join('')];
        for (let base = 0; base < vm.memory.length; base += columns) {
            const cells = [`<th>${base.toString().padStart(3, '0')}</th>`];
            for (let offset = 0; offset < columns; offset += 1) {
                const address = base + offset;
                if (address < vm.memory.length) {
                    cells.push(`<td>${vm.memory[address]}</td>`);
                } else {
                    cells.push('<td></td>');
                }
            }
            rows.push(`<tr>${cells.join('')}</tr>`);
        }
        elements.memoryTable.innerHTML = rows.join('');
    };

    const syncOutput = () => {
        elements.stdout.value = vm.getOutput();
    };

    const refreshUI = () => {
        renderRegisters();
        renderMemory();
        syncOutput();
    };

    elements.loadBtn.addEventListener('click', () => {
        try {
            vm.loadProgram(elements.program.value);
            vm.setInput(elements.stdin.value);
            elements.stdout.value = '';
            setStatus('Program loaded and CPU reset.', 'success');
            refreshUI();
        } catch (error) {
            console.error(error);
            setStatus(error.message, 'error');
        }
    });

    elements.stepBtn.addEventListener('click', () => {
        try {
            if (!vm.program.length) {
                setStatus('Load a program before stepping.', 'error');
                return;
            }
            vm.step();
            refreshUI();
            setStatus(vm.halted ? 'Execution halted.' : 'Executed one instruction.', vm.halted ? 'info' : 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message, 'error');
        }
    });

    elements.runBtn.addEventListener('click', () => {
        try {
            if (!vm.program.length) {
                setStatus('Load a program before running.', 'error');
                return;
            }
            const result = vm.run();
            refreshUI();
            setStatus(result.halted ? `Program completed in ${result.steps} steps.` : 'Execution stopped.', 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message, 'error');
        }
    });

    elements.resetBtn.addEventListener('click', () => {
        try {
            vm.resetState({ clearMemory: true });
            vm.setInput(elements.stdin.value);
            elements.stdout.value = '';
            refreshUI();
            setStatus('CPU state cleared.', 'success');
        } catch (error) {
            console.error(error);
            setStatus(error.message, 'error');
        }
    });

    const initialise = () => {
        elements.program.value = SAMPLE_PROGRAM;
        elements.stdin.value = '';
        elements.stdout.value = '';
        refreshUI();
        setStatus('Load the sample program and press Run to begin.');
    };

    initialise();
})();
