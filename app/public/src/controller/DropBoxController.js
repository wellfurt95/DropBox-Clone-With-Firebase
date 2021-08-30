class DropBoxController {
    constructor() {
        this.currentFolder = ['Root']
        this.onSelectionChange = new Event('selectionchange')
        this.btnSendFileEl = document.querySelector('#btn-send-file')
        this.inputFilesEl = document.querySelector('#files')
        this.snackModalEl = document.querySelector('#react-snackbar-root')
        this.progressBarEl = this.snackModalEl.querySelector('.mc-progress-bar-fg')
        this.nameFileEl = this.snackModalEl.querySelector('.filename')
        this.timeLeftEl = this.snackModalEl.querySelector('.timeleft')
        this.listFilesEl = document.querySelector('#list-of-files-and-directories')
        this.body = document.querySelectorAll('.list-unstyled, .sidebar-sticky')
        this.btnNewFolder = document.querySelector('#btn-new-folder')
        this.btnRename = document.querySelector('#btn-rename')
        this.btnDelete = document.querySelector('#btn-delete')
        this.NavEl = document.querySelector('#browse-location')
        
        this.connectToFirebase()
        this.openFolder()
        this.bodyEvents()
        this.initEvents()

        

    }

    bodyEvents() {
        this.body.forEach(elementBody => {
            elementBody.addEventListener('click', e => {
                if (e.target.classList.contains('list-unstyled') || e.target.classList.contains('sidebar-sticky')) {
                    this.getListFiles().forEach(elements => {
                        elements.classList.remove('selected')
                        this.CallDispatchEvent()
                    })
                } else {

                }
            })
        })


    }

    connectToFirebase() {

        var firebaseConfig = {
            apiKey: "AIzaSyCVWpF2hDoJGaVsSwlQQ5cjYX7T9-dy05Q",
            authDomain: "dropboxclone-da4da.firebaseapp.com",
            databaseURL: "https://dropboxclone-da4da-default-rtdb.firebaseio.com",
            projectId: "dropboxclone-da4da",
            storageBucket: "dropboxclone-da4da.appspot.com",
            messagingSenderId: "375165682498",
            appId: "1:375165682498:web:485ea8e242152484a5bedb",
            measurementId: "G-Y5TJ4PC62N"
        };
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
    }

    getSelection() {
        return this.listFilesEl.querySelectorAll('.selected')
    }

    removeTask() {
        let promises = []

        this.getSelection().forEach(li => {

            let file = JSON.parse(li.dataset.file)
            let key = li.dataset.key
            let formData = new FormData()
            formData.append('path', file.path)
            formData.append('key', key)

            promises.push(this.ajax('DELETE', '/file', formData))

        })

        return Promise.all(promises)
    }

    initEvents() {

        this.btnNewFolder.addEventListener('click', e => {
            let name = prompt("Nome da nova pasta", 'Nova Pasta')

            if (name) {
                this.getFireBaseRef().push().set({
                    name,
                    type: 'folder',
                    path: this.currentFolder.join('/')
                })
            }
        })

        this.btnRename.addEventListener('click', e => {

            let li = this.getSelection()[0]
            let file = JSON.parse(li.dataset.file)
            let name = prompt("Renomear o arquivo", file.name)

            if (name) {
                file.name = name
                this.getFireBaseRef().child(li.dataset.key).set(file)               
            }
        })

        this.btnDelete.addEventListener('click', e => {

            this.removeTask().then(responses => {

                responses.forEach(resp => {
                    if (resp.fields.key) {
                        this.getFireBaseRef().child(resp.fields.key).remove()
                    }
                })

            }).catch(err => {
                console.log(err)
            })

        })

        this.listFilesEl.addEventListener('selectionchange', e => {
            switch (this.getSelection().length) {
                case 0:
                    this.btnRename.style.display = 'none'
                    this.btnDelete.style.display = 'none'
                    break
                case 1:
                    this.btnRename.style.display = 'block'
                    this.btnDelete.style.display = 'block'
                    break
                default:
                    this.btnRename.style.display = 'none'
                    this.btnDelete.style.display = 'block'
                    break
            }
        })

        this.btnSendFileEl.addEventListener('click', event => {
            this.inputFilesEl.click()
        })

        this.inputFilesEl.addEventListener('change', event => {

            this.btnSendFileEl.disabled = true

            this.uploadTask(event.target.files).then(responses => {
                responses.forEach(resp => {

                    this.getFireBaseRef().push().set(resp.files['input-file'])

                })

                this.uploadComplete()

            }).catch(err => {

                this.uploadComplete()

                console.log(err)
            })

            this.modalShow()

        })
    }

    uploadComplete() {

        this.modalShow(false)
        this.inputFilesEl.value = ''
        this.btnSendFileEl.disabled = false
    }

    getFireBaseRef(path) {

        if (!path) path = this.currentFolder.join('/')

        return firebase.database().ref(path)
    }

    modalShow(show = true) {
        this.snackModalEl.style.display = (show) ? 'block' : 'none'
    }

    ajax(method = GET, url, formData = new FormData(), onprogress = function () { }, onloadstart = function () { }) {
        return new Promise((resolve, reject) => {
            let ajax = new XMLHttpRequest()

            ajax.open(method, url)


            ajax.onload = event => {

                try {
                    resolve(JSON.parse(ajax.responseText))
                } catch (e) {
                    reject(e)
                }
            }
            ajax.onerror = event => {
                reject(event)
            }

            ajax.upload.onprogress = onprogress

            onloadstart()

            ajax.send(formData)
        })

    }

    uploadTask(files) {

        let promises = [];

        [...files].forEach(file => {

            let formData = new FormData()

            formData.append('input-file', file)

            promises.push(this.ajax('POST', '/upload', formData, () => {

                this.uploadProgress(event, file)

            }, () => {
                this.startUploadTime = Date.now()
            }))
        })

        return Promise.all(promises)
    }

    uploadProgress(event, file) {

        let timeSpant = Date.now() - this.startUploadTime;
        let loaded = event.loaded
        let total = event.total

        let porcent = parseInt((loaded / total) * 100)
        let timeleft = ((100 - porcent) * timeSpant) / porcent

        this.progressBarEl.style.width = `${porcent}%`

        this.nameFileEl.innerHTML = file.name
        this.timeLeftEl.innerHTML = this.formatTime(timeleft)


    }

    formatTime(duration) {
        let seconds = parseInt((duration / 1000) % 60)
        let minutes = parseInt((duration / (1000 * 60)) % 60)
        let hours = parseInt((duration / (1000 * 60 * 60)) % 24)

        if (hours > 0) {
            return `${hours} horas, ${minutes} minutos e ${seconds} segundos`
        }

        if (minutes > 0) {
            return `${minutes} minutos e ${seconds} segundos`
        }

        if (seconds > 0) {
            return `${seconds} segundos`
        }

        return '0 segundos'


    }

    getFileIconView(file) {

        switch (file.type) {
            case 'folder':
                return `
                        <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                        <title>content-folder-large</title>
                        <g fill="none" fill-rule="evenodd">
                            <path d="M77.955 53h50.04A3.002 3.002 0 0 1 131 56.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 114.995V45.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#71B9F4"></path>
                            <path d="M77.955 52h50.04A3.002 3.002 0 0 1 131 55.007v58.988a4.008 4.008 0 0 1-4.003 4.005H39.003A4.002 4.002 0 0 1 35 113.995V44.99c0-2.206 1.79-3.99 3.997-3.99h26.002c1.666 0 3.667 1.166 4.49 2.605l3.341 5.848s1.281 2.544 5.12 2.544l.005.003z" fill="#92CEFF"></path>
                        </g>
                        </svg>
                                    
                `
                break
            case 'image/jpeg':
            case 'image/jpg':
            case 'image/png':
            case 'image/gif':

                this.name = file.path.split("\\");
                let result;
                [...this.name].forEach((element, index) => {
                    if (index > [this.name].length) result = element
                })

                return `

                <div align="center">
<img src="upload/${result}" align="center" x="0px" y="0px" width="160px" height="160px" viewbox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
</div>
    <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterunits="objectBoundingBox" y="-.5%" x="-.7%">


            `
                break

            case 'application/pdf':
                return `
                <svg version="1.1" id="Camada_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="160px" height="160px" viewBox="0 0 160 160" enable-background="new 0 0 160 160" xml:space="preserve">
                                        <filter height="102%" width="101.4%" id="mc-content-unknown-large-a" filterUnits="objectBoundingBox" y="-.5%" x="-.7%">
                                            <feOffset result="shadowOffsetOuter1" in="SourceAlpha" dy="1"></feOffset>
                                            <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1">
                                            </feColorMatrix>
                                        </filter>
                                        <title>PDF</title>
                                        <g>
                                            <g>
                                                <g filter="url(#mc-content-unknown-large-a)">
                                                    <path id="mc-content-unknown-large-b_2_" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47c-2.209,0-4-1.791-4-4V34
                                                            C43,31.791,44.791,30,47,30z"></path>
                                                </g>
                                                <g>
                                                    <path id="mc-content-unknown-large-b_1_" fill="#F7F9FA" d="M47,30h66c2.209,0,4,1.791,4,4v92c0,2.209-1.791,4-4,4H47
                                                            c-2.209,0-4-1.791-4-4V34C43,31.791,44.791,30,47,30z"></path>
                                                </g>
                                            </g>
                                        </g>
                                        <path fill-rule="evenodd" clip-rule="evenodd" fill="#F15124" d="M102.482,91.479c-0.733-3.055-3.12-4.025-5.954-4.437
                                                c-2.08-0.302-4.735,1.019-6.154-0.883c-2.167-2.905-4.015-6.144-5.428-9.482c-1.017-2.402,1.516-4.188,2.394-6.263
                                                c1.943-4.595,0.738-7.984-3.519-9.021c-2.597-0.632-5.045-0.13-6.849,1.918c-2.266,2.574-1.215,5.258,0.095,7.878
                                                c3.563,7.127-1.046,15.324-8.885,15.826c-3.794,0.243-6.93,1.297-7.183,5.84c0.494,3.255,1.988,5.797,5.14,6.825
                                                c3.062,1,4.941-0.976,6.664-3.186c1.391-1.782,1.572-4.905,4.104-5.291c3.25-0.497,6.677-0.464,9.942-0.025
                                                c2.361,0.318,2.556,3.209,3.774,4.9c2.97,4.122,6.014,5.029,9.126,2.415C101.895,96.694,103.179,94.38,102.482,91.479z
                                                M67.667,94.885c-1.16-0.312-1.621-0.97-1.607-1.861c0.018-1.199,1.032-1.121,1.805-1.132c0.557-0.008,1.486-0.198,1.4,0.827
                                                C69.173,93.804,68.363,94.401,67.667,94.885z M82.146,65.949c1.331,0.02,1.774,0.715,1.234,1.944
                                                c-0.319,0.725-0.457,1.663-1.577,1.651c-1.03-0.498-1.314-1.528-1.409-2.456C80.276,65.923,81.341,65.938,82.146,65.949z
                                                M81.955,86.183c-0.912,0.01-2.209,0.098-1.733-1.421c0.264-0.841,0.955-2.04,1.622-2.162c1.411-0.259,1.409,1.421,2.049,2.186
                                                C84.057,86.456,82.837,86.174,81.955,86.183z M96.229,94.8c-1.14-0.082-1.692-1.111-1.785-2.033
                                                c-0.131-1.296,1.072-0.867,1.753-0.876c0.796-0.011,1.668,0.118,1.588,1.293C97.394,93.857,97.226,94.871,96.229,94.8z"></path>
                                    </svg>
                `
                break

            case 'audio/mp3':
            case 'audio/ogg':
                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                                        <title>content-audio-large</title>
                                        <defs>
                                            <rect id="mc-content-audio-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                                            <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-audio-large-a">
                                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                                            </filter>
                                        </defs>
                                        <g fill="none" fill-rule="evenodd">
                                            <g>
                                                <use fill="#000" filter="url(#mc-content-audio-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-audio-large-b"></use>
                                            </g>
                                            <path d="M67 60c0-1.657 1.347-3 3-3 1.657 0 3 1.352 3 3v40c0 1.657-1.347 3-3 3-1.657 0-3-1.352-3-3V60zM57 78c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm40 0c0-1.657 1.347-3 3-3 1.657 0 3 1.349 3 3v4c0 1.657-1.347 3-3 3-1.657 0-3-1.349-3-3v-4zm-20-5.006A3 3 0 0 1 80 70c1.657 0 3 1.343 3 2.994v14.012A3 3 0 0 1 80 90c-1.657 0-3-1.343-3-2.994V72.994zM87 68c0-1.657 1.347-3 3-3 1.657 0 3 1.347 3 3v24c0 1.657-1.347 3-3 3-1.657 0-3-1.347-3-3V68z" fill="#637282"></path>
                                        </g>
                                    </svg>
                    `
                break

            case 'video/mp4':
            case 'video/quicktime':
                return `
                        <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                                        <title>content-video-large</title>
                                        <defs>
                                            <rect id="mc-content-video-large-b" x="30" y="43" width="100" height="74" rx="4"></rect>
                                            <filter x="-.5%" y="-.7%" width="101%" height="102.7%" filterUnits="objectBoundingBox" id="mc-content-video-large-a">
                                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                                            </filter>
                                        </defs>
                                        <g fill="none" fill-rule="evenodd">
                                            <g>
                                                <use fill="#000" filter="url(#mc-content-video-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-video-large-b"></use>
                                            </g>
                                            <path d="M69 67.991c0-1.1.808-1.587 1.794-1.094l24.412 12.206c.99.495.986 1.3 0 1.794L70.794 93.103c-.99.495-1.794-.003-1.794-1.094V67.99z" fill="#637282"></path>
                                        </g>
                                    </svg>
                        `
                break

            default:

                return `
                    <svg width="160" height="160" viewBox="0 0 160 160" class="mc-icon-template-content tile__preview tile__preview--icon">
                                        <title>1357054_617b.jpg</title>
                                        <defs>
                                            <rect id="mc-content-unknown-large-b" x="43" y="30" width="74" height="100" rx="4"></rect>
                                            <filter x="-.7%" y="-.5%" width="101.4%" height="102%" filterUnits="objectBoundingBox" id="mc-content-unknown-large-a">
                                                <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                                                <feColorMatrix values="0 0 0 0 0.858823529 0 0 0 0 0.870588235 0 0 0 0 0.88627451 0 0 0 1 0" in="shadowOffsetOuter1"></feColorMatrix>
                                            </filter>
                                        </defs>
                                        <g fill="none" fill-rule="evenodd">
                                            <g>
                                                <use fill="#000" filter="url(#mc-content-unknown-large-a)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                                                <use fill="#F7F9FA" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#mc-content-unknown-large-b"></use>
                                            </g>
                                        </g>
                                    </svg>
                    `

                break

        }

    }

    getFileView(file, key) {

        let li = document.createElement('li')
        li.dataset.key = key
        li.dataset.file = JSON.stringify(file)

        li.innerHTML = `
            ${this.getFileIconView(file)}
            <div class="name text-center">${file.name}</div>
        `

        this.initEventsLi(li)

        return li
    }

    readFiles() {
        this.lastFolder = this.currentFolder.join('/')

        this.getFireBaseRef().on('value', snapshot => {

            this.listFilesEl.innerHTML = ''

            snapshot.forEach(snapshotItem => {


                let key = snapshotItem.key
                let data = snapshotItem.val()
                if (data.type) {
                    this.listFilesEl.appendChild(this.getFileView(data, key))
                }


            })
        })
    }

    getListFiles() {
        return [...this.listFilesEl.children]
    }

    CallDispatchEvent() {
        this.listFilesEl.dispatchEvent(this.onSelectionChange)
    }

    openFolder() {
        if (this.lastFolder) {
            this.getFireBaseRef(this.lastFolder).off('value')
        }
        this.renderNav()
        this.readFiles()
    }

    renderNav() {

        let nav = document.createElement('nav')
        let path = []


        for (let i = 0; i < this.currentFolder.length; i++) {
            let folderName = this.currentFolder[i]

            let span = document.createElement('span')

            path.push(folderName)

            if ((i + 1) === this.currentFolder.length) {

                span.innerHTML = folderName

            } else {
                span.className = 'breadcrumb-segment__wrapper'
                span.innerHTML = `
                <span class="ue-effect-container uee-BreadCrumbSegment-link-0">
                <a href="#" data-path="${path.join('/')}" class="breadcrumb-segment">${folderName}</a>
            </span>
            <svg width="24" height="24" viewBox="0 0 24 24" class="mc-icon-template-stateless" style="top: 4px; position: relative;">
                <title>arrow-right</title>
                <path d="M10.414 7.05l4.95 4.95-4.95 4.95L9 15.534 12.536 12 9 8.464z" fill="#637282" fill-rule="evenodd"></path>
            </svg>
                `
            }

            nav.appendChild(span)
        }

        this.NavEl.innerHTML = nav.innerHTML

        this.NavEl.querySelectorAll('a').forEach(a =>{
            a.addEventListener('click', e=>{
                e.preventDefault()
                this.currentFolder = a.dataset.path.split('/')

                this.openFolder()
                
            })
        })
    }



    initEventsLi(li) {

        li.addEventListener('dblclick', e => {
            let file = JSON.parse(li.dataset.file)

            switch (file.type) {
                case 'folder':
                    this.currentFolder.push(file.name)
                    this.openFolder()
                    break
                default:
                    window.open('/file?path=' + file.path)
            }
        })


        li.addEventListener('click', e => {



            if (e.ctrlKey) {

                li.classList.add('selected')
                this.CallDispatchEvent()

            } else if (e.shiftKey) {

                let firstLi = this.listFilesEl.querySelector('.selected')
                this.CallDispatchEvent()

                if (firstLi) {
                    let indexStart;
                    let indexEnd;
                    this.getListFiles().forEach((element, index) => {
                        if (firstLi === element) indexStart = index
                        if (li === element) indexEnd = index

                    })

                    let index = [indexStart, indexEnd].sort();

                    this.getListFiles().forEach((element, i) => {
                        if (i >= index[0] && i <= index[1]) {
                            element.classList.add('selected')
                            this.CallDispatchEvent()
                        }
                    })

                } else {
                    let myIndex;
                    this.getListFiles().forEach((element, index) => {
                        if (element === li) {
                            myIndex = index
                        }
                    });

                    this.getListFiles().forEach((element, i) => {
                        if (i <= myIndex) {

                            element.classList.add('selected')
                            this.CallDispatchEvent()
                        }
                    })

                }

            } else {
                this.getListFiles().forEach(element => {
                    if (element == li) {
                        li.classList.toggle('selected')
                        this.CallDispatchEvent()
                    } else {
                        element.classList.remove('selected')
                        this.CallDispatchEvent()
                    }
                })
            }





        })
    }

}