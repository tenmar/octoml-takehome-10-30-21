app.component('main-content', {
    props: {
        data: {
            type: Array,
            required: true
        },
        errors: {
            type: Array,
            required: true
        }
    },
    template: /*html*/ `
        <div class='forms'>
            <div class='main-form'>
                <h3>Octomize</h3>

                <optimization-selector type="benchmark" title="Benchmark" subtitle="This is some sub content to explain benchmarking." :options="benchmark_options" @did-select-type="handleTypeChecked"></optimization-selector>
                
                <optimization-selector type="accelerate" title="Accelerate" subtitle="Could even open this accordion for a paragraph of text." :options="acceleration_options" @did-select-type="handleTypeChecked"></optimization-selector>

            
                <div id='hardware-targets-header'>
                    <h4 style="flex:1">Hardware Targets</h4>
                    <button id="add-button" style="height:32px" @click="addTarget">Add</button>
                </div>
                <table>
                    <tr class='table-header'>
                        <th id="first" style="width:256px">PROVIDER</th> 
                        <th style="width:256px">INSTANCE</th>
                        <th style="width:103px">VCPU</th>
                        <th style="width:103px">MEMORY (GIB)</th>
                        <th style="flex:1"></th>
                    </tr>
                    <tr v-for='(target, index) in targets' class="target-row">
                        <td style="width:256px">
                            <styled-select placeholder="Select Provider" :opts="providers(index)" v-model="target.provider" @update:modelValue="handleTargetChanged(index)"></styled-select>
                        </td>
                        <td style="width:256px">
                            <styled-select placeholder="Select Instance" :opts="instances(index)" v-model="target.instance" :class="{ disabled: !target.provider }" @update:modelValue="handleTargetChanged(index)"></styled-select>
                        </td>
                        <td id='cpu' style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ target.cpu }}
                        </td>
                        <td id="memory" style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ target.memory }}
                        </td>
                        <td class='delete-cell' style="flex:1">
                            <img v-if="target.provider && target.instance" class='delete-button' src='./assets/images/delete.png' @click="handleRemove(index)">
                        </td>
                    </tr>
                </table>
            </div>

            <div class='summary-form-container'>
                <div class='summary-form'>
                    <p id="total-label">Total runs</p>
                    <p id="total">{{ totalRuns }}</p>
                    <div v-for="(target, index) in validTargets" class='summary-row'>
                        <div class='summary-item-left'>
                            <p class='summary-item-instance'>{{ target.instance }}</p>
                            <p class='summary-item-cores'>{{ target.cpu }} cores</p>
                        </div>
                        <p class='summary-item-runs'>{{ runs }}</p>
                        {{ errors.length > 1 }}
                    </div>

                    <button class="octomize-button" :disabled="!canOctomize" :class="{ disabled: !canOctomize }" @click="handleOctomize">Octomize</button>
                </div>
            </div>

        </div>
    `,

    data() {
        return {
            types: [],
            benchmark_options: {
                engine: 'ONNX',
                num_trials: 1,
                runs_per_trial: 1
            },
            acceleration_options: {
                engine: 'ONNX',
                kernel_trials: 1,
            },
            targets: [
                { provider: '', instance: '', cpu: 0, memory: 0 }
            ]
        }
    },

    
    methods: {
        
        handleTypeChecked({ checked, type }) {
            const ind = this.types.indexOf(type)
            if (!checked && ind >= 0) {
                this.types.splice(ind, 1)
            } else if (checked && ind < 0) {
                this.types.push(type)
            }
        },

        addTarget() {
            if (this.targets.length >= this.data.length) { return }
            this.targets.push(
                { provider: '', instance: '', cpu: 0, memory: 0 }
            )
            this.$emit('targets-changed')
        },
        getTarget(targetIndex) {
            return this.targets[targetIndex]
        },
        getHardware(targetIndex) {
            const target = this.getTarget(targetIndex)
            const item = this.data.find(v => v.provider == target.provider &&  v.instance == target.instance)

            return item
        },
        doesTargetExist(hardware, index) {
            return this.targets.find((v, ind) => ind != index && v.provider == hardware.provider && v.instance == hardware.instance) !== undefined
        },
        handleRemove(index) {
            this.targets.splice(index, 1)
            if (this.targets.length == 0) {
                this.addTarget()
            } else {
                this.$emit('targets-changed')
            }
        },

        handleTargetChanged(index) {
            const target = this.targets[index]

            const instances = this.data.filter(v => v.provider == target.provider).map(v => v.instance)

            if (!instances.includes(target.instance)) {
                target.instance = ''
            }

            target.cpu = this.vcpu(index)
            target.memory = this.memory(index)

            this.$emit('targets-changed')
        },

        providers(index) {
            if (index == undefined) {
                return []
            }

            return this.data.filter(v => !this.doesTargetExist(v, index))
                .map(v => v.provider)
                .filter((v, i, s) => s.indexOf(v) === i)
        },
        
        instances(index) {
            if (index == undefined) {
                return []
            }
            
            const target = this.getTarget(index)
            return this.data
                .filter(v => v.provider == target.provider && !this.doesTargetExist(v, index))
                .map(v => v.instance)
        },

        vcpu(index) {
            const item = this.getHardware(index)
            return (item && item.cpu) || 0
        },

        memory(index) {
            const item = this.getHardware(index)

            return (item && item.memory) || 0
        },

        /// RUN
        getBenchmarkPayloads() {
            if (!this.types.includes('benchmark')) {
                return null
            }


            let result = []

            for (let target of this.targets) {
                result.push(
                    {    
                        engine: this.benchmark_options.engine,
                        hardware: target,
                        num_trials: parseInt(this.benchmark_options.num_trials),
                        runs_per_trial: parseInt(this.benchmark_options.runs_per_trial)
                    }
                )
            }

            return result
        },
        getAcceleratePayloads() {
            if (!this.types.includes('accelerate')) {
                return null
            }

            let result = []
            
            for (let target of this.targets) {

                const engine = this.acceleration_options.engine == 'TVM' ? 
                    { TVM: { kernel_trials: parseInt(this.acceleration_options.kernel_trials) } } : this.acceleration_options.engine

                result.push(
                    {
                        engine: engine,
                        hardware: target
                    }
                )
            }

            return result
        },
        handleOctomize() {

            this.$emit('start-runs', {
                benchmark: this.getBenchmarkPayloads(),
                accelerate: this.getAcceleratePayloads()
            })
        }
    },


    computed: {
        validTargets() {
            return this.targets.filter(v => v.provider && v.instance )
        },
        canOctomize() {
            return this.validTargets.length > 0 && this.targets.length == this.validTargets.length && this.types.length > 0
        },
        benchmarkTrials() {
            return parseInt(this.benchmark_options.num_trials)
        },
        benchmarkRuns() {
            return parseInt(this.benchmark_options.runs_per_trial)
        },
        accelerateKernelTrials() {
            return this.acceleration_options.engine == 'TVM' ? parseInt(this.acceleration_options.kernel_trials) : 1
        },
        runs() {
            let runs = 0
            if (this.types.includes('benchmark') && this.benchmark_options.engine) {
                console.log("Benchmark options?", this.benchmark_options,)
                runs += this.benchmarkTrials * this.benchmarkRuns
            }

            if (this.types.includes('accelerate') && this.acceleration_options.engine ) {
                console.log("Accelerate options?", this.acceleration_options)
                runs += this.accelerateKernelTrials
            }

            console.log("runs", runs)

            return runs
        },
        totalRuns() {
            return this.runs * this.validTargets.length
        },
        
    }
})


app.component('optimization-selector', {
    props: {
        type: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        
        subtitle: {
            type: String,
            required: true,
        },

        options: {
            type: Object,
            required: true
        }
    },

    template: /*html*/ `
        <div class="option-pane-container">
            <div class="option-pane" @click="toggleExpand">
                <input id='check' type="checkbox" @click.stop @change="handleCheckbox($event)">
                <div style="flex:1"> 
                    <p id="title">{{ title }}</p>
                    <p id="subtitle">{{ subtitle }}</p>
                </div>
                <img style="width:10px" src='./assets/images/chevron.png' :class="{ expanded: expanded }" />
            </div>
            <div class="option-pane-options" v-if="expanded && type == 'benchmark'">
                <label for='trials'>Engine</label>
                <styled-select id='engine' width="100px" v-model="options.engine" :opts="engines"></styled-select>
                <label for='trials' :class="{ disabled: !options.engine }"># of Trials</label>
                <input :disabled="!options.engine" id="trials" type='number' v-model="options.num_trials">
                <label for='runs' :class="{ disabled: !options.engine }">Runs Per Trial</label>
                <input :disabled="!options.engine" id="runs" type='number' v-model="options.runs_per_trial">

            </div>
            <div class="option-pane-options" v-if="expanded && type == 'accelerate'">
                <label for='trials'>Engine</label>
                <styled-select id='engine' width="100px" v-model="options.engine" :opts="engines"></styled-select>
                <label for='kernel_trials' v-if="options.engine == 'TVM'">Kernel Trials</label>
                <input id="kernel_trials" v-if="options.engine == 'TVM'" type='number' v-model="options.kernel_trials">

            </div>
        </div>
    `,

    data() {
        return {
            expanded: false,
            engines: ['ONNX', 'TVM']
        }
    },
    
    methods: {
        toggleExpand() {
            this.expanded = !this.expanded
        },
        handleCheckbox(evt) {
            this.$emit('did-select-type', { checked: evt.target.checked, type: this.type })
        }
    }
})


app.component('styled-select', {
    // need tabindex="0" to focus div
    template: /*html*/ `
        <div class="styled-select" @blur="unfocus" tabindex="0"> 
            <div class="select-dropdown" :style="[ width ? { width: width } : {}]" v-if="open">
                <div class="select-options" v-for="(opt, i) of opts" @click="handleClick(opt)">{{ opt }}</div>
            </div>
            <div class="select-input" @click="toggleOpen">
                <p>{{ selected }}</p>
                <img src="./assets/images/chevron.png">
            </div>
        </div>
    `,
    props: {
        opts: {
          type: Array,
          required: true,
        },
        placeholder: {
            type: String,
            required: false,
            default: ''
        },
        modelValue: {
            type: String,
        },
        width: {
            type: String,
        }
      },
      data() {
        return {
          open: false,
          selected_value: this.placeholder || ''
        };
      },
      methods: {
          unfocus() {
              console.log("Blur?")
            //   this.open = false
          },
          toggleOpen() {
              if (this.opts.length == 0) { return }
              this.open = !this.open
          },
          handleClick(option) {
            if (this.opts.length == 0) { return }

            this.selected_value = option;
            this.open = false;
            this.$emit('update:modelValue', option);
          }
      },
      computed: {
          selected() {
              return this.modelValue || this.placeholder
          }
      },
})