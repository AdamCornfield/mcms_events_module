module.exports =  ({ auth, func, db, valid}) => {
    const express = require('express')
    const { randomUUID } = require('crypto') 
    const router = express.Router()
    const luxon = require('luxon')
    const path = require('path')

    
    let DateTime = luxon.DateTime

    const moduleName = 'events' // Set this to the name of your module, it should not include the full tag used, for example the MCMS_events_module, will just be events

    router.get('/', (req, res) => {
            db.query('SELECT * FROM events WHERE end >= UNIX_TIMESTAMP() ORDER by start ASC', (err, results) => {
                if (err) {
                    res.sendStatus(500)
                    console.error(err)
                } else {
                    results = results.map(event => ({
                        ...event,
                        start: DateTime.fromSeconds(event.start),
                        end: DateTime.fromSeconds(event.end)
                    }))

                    
                    func.getUserData(req.user, (success, userData) => {
                        if (!success) {
                            console.error('Error fetching user data:', userData)
                        } else {
                            res.render('default', {
                                isAuthenticated: req.isAuthenticated(),
                                userData,
                                pagePath: `module-${moduleName}/home`,
                                pageTitle: 'Community Events - MCMS',
                                events: results,
                                feedback: req.query
                            })
                        }
                    })
                }
            })
        }
    )

    router.route('/create')
    .get(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {     
        func.getUserData(req.user, (success, userData) => {
            if (!success) {
                console.error('Error fetching user data:', userData)
            } else {
                res.render('default', {
                    isAuthenticated: req.isAuthenticated(),
                    userData,
                    pagePath: `module-${moduleName}/create`,
                    pageTitle: 'Create Event - MCMS',
                    errors: [],
                    formData: {}
                })
            }
        })
    })
    .post(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        let {
            name,
            description,
            start,
            end,
            tags
        } = req.body

        let errors = []

        // Sanitise inputs
        name = valid.sanitiseInput(name || '')
        description = valid.sanitiseInput(description || '')
        tags = valid.sanitiseInput(tags || '')

        // Convert datetime-local inputs to Luxon
        let startDate = null
        let endDate = null

        // Validation
        if (!name) errors.push({ field: 'name', message: 'Event name is required' })
        
        if (!description) errors.push({ field: 'description', message: 'Description is required' })
        
        if (!start) {
            errors.push({ field: 'start', message: 'Start time is required' })
        } else {
            startDate = DateTime.fromISO(start)
        
            if (!startDate.isValid) {
                errors.push({ field: 'start', message: 'Invalid start time' })
            }
        }

        if (!end) {
            errors.push({ field: 'end', message: 'End time is required' })
        } else {
            endDate = DateTime.fromISO(end)
        
            if (!endDate.isValid) {
                errors.push({ field: 'end', message: 'Invalid end time' })
            }
        }

        // Logical validation
        if (startDate && endDate && endDate <= startDate) {
            errors.push({ field: 'end', message: 'End time must be after start time' })
        }

        if (errors.length > 0) {     
            func.getUserData(req.user, (success, userData) => {
                if (!success) {
                    console.error('Error fetching user data:', userData)
                } else {
                    res.render('default', {
                        isAuthenticated: req.isAuthenticated(),
                        userData,
                        pagePath: `module-${moduleName}/create`,
                        pageTitle: 'Create Event - MCMS',
                        errors: errors,
                        formData: {
                            name,
                            description,
                            start,
                            end,
                            tags
                        }
                    })
                }
            })
        
        } else {
        
            // Convert to UNIX timestamps (consistent with your system)
            const startUnix = Math.trunc(startDate.toSeconds())
            const endUnix = Math.trunc(endDate.toSeconds())
        
            const newEvent = [
                randomUUID(),
                name,
                description,
                startUnix,
                endUnix,
                Math.trunc(DateTime.utc().toSeconds()),
                req.user, // assuming this is userID from passport
                tags || null
            ]
        
            db.query(
                'INSERT INTO events (eventID, name, description, start, end, created, createdBy, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                newEvent,
                (err, results) => {
                    if (err) {
                        console.error(err)
                        res.redirect('/events/create')
                    } else {
                        res.redirect('/events?type=success&message=Event Created Successfully')
                    }
                }
            )
        }
    })

    router.route('/edit/:eventID')
    .get(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        db.query('SELECT * FROM events WHERE eventID = ?', [req.params.eventID], (err, results) => {
            if (err) {
                res.sendStatus(500)
                console.error(err)
            } else {
                let event = results[0]
                event.start = DateTime.fromSeconds(event.start)
                event.end = DateTime.fromSeconds(event.end)

                func.getUserData(req.user, (success, userData) => {
                    if (!success) {
                        console.error('Error fetching user data:', userData)
                    } else {
                        res.render('default', {
                            isAuthenticated: req.isAuthenticated(),
                            userData,
                            pagePath: `module-${moduleName}/edit`,
                            pageTitle: 'Edit Event - MCMS',
                            event,
                            errors: []
                        })
                    }
                })
            }
        })
    })
    .post(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        const eventID = req.params.eventID

        let {
            name,
            description,
            start,
            end,
            tags
        } = req.body

        let errors = []

        // Sanitise inputs
        name = valid.sanitiseInput(name || '')
        description = valid.sanitiseInput(description || '')
        tags = valid.sanitiseInput(tags || '')

        // Convert datetime-local inputs to Luxon
        let startDate = null
        let endDate = null

        // Validation
        if (!name) errors.push({ field: 'name', message: 'Event name is required' })
        
        if (!description) errors.push({ field: 'description', message: 'Description is required' })
        
        if (!start) {
            errors.push({ field: 'start', message: 'Start time is required' })
        } else {
            startDate = DateTime.fromISO(start)

            if (!startDate.isValid) {
                errors.push({ field: 'start', message: 'Invalid start time' })
            }
        }

        if (!end) {
            errors.push({ field: 'end', message: 'End time is required' })
        } else {
            endDate = DateTime.fromISO(end)

            if (!endDate.isValid) {
                errors.push({ field: 'end', message: 'Invalid end time' })
            }
        }

        // Logical validation
        if (startDate && endDate && endDate <= startDate) {
            errors.push({ field: 'end', message: 'End time must be after start time' })
        }

        if (errors.length > 0) {

            func.getUserData(req.user, (success, userData) => {
                if (!success) {
                    console.error('Error fetching user data:', userData)
                } else {
                    res.render('default', {
                        isAuthenticated: req.isAuthenticated(),
                        userData,
                        pagePath: `module-${moduleName}/edit`,
                        pageTitle: 'Edit Event - MCMS',
                        errors: errors,
                        event: {
                            eventID,
                            name,
                            description,
                            start: DateTime.fromISO(start),
                            end: DateTime.fromISO(end),
                            tags
                        }
                    })
                }
            })

        } else {

            // Convert to UNIX timestamps
            const startUnix = Math.trunc(startDate.toSeconds())
            const endUnix = Math.trunc(endDate.toSeconds())

            db.query(
                'UPDATE events SET name = ?, description = ?, start = ?, end = ?, tags = ? WHERE eventID = ?',
                [
                    name,
                    description,
                    startUnix,
                    endUnix,
                    tags || null,
                    eventID
                ],
                (err, results) => {
                    if (err) {
                        console.error(err)
                        res.redirect(`/events/edit/${eventID}`)
                    } else {
                        res.redirect(`/events?type=success&message=Event edited successfully`)
                    }
                }
            )
        }
    })

    router.post('/delete/:eventID', auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        const eventID = req.params.eventID
        const confirmDeleteText = valid.sanitiseInput(req.body.confirmDeleteText || '')

        // Fetch the event to get the actual name
        db.query('SELECT name FROM events WHERE eventID = ?', [eventID], (err, results) => {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (!results || results.length === 0) {
                res.sendStatus(404)
            } else {
                const eventName = results[0].name
                
                // Compare case-insensitively
                if (confirmDeleteText.toLowerCase() === eventName.toLowerCase()) {
                    // Delete the event
                    db.query('DELETE FROM events WHERE eventID = ?', [eventID], (err, results) => {
                        if (err) {
                            console.error(err)
                        }
                    })
                }

                res.redirect('/events?type=success&message=Event deleted successfully')
            }
        })
    })

    return {
        router,
        viewsPath: path.join(__dirname, '/views'), // Injects the custom views for this module.
        staticPath: path.join(__dirname, '/public'), // Injects the static files location for this module.
        basePath: `/${moduleName}` // This is the base path that will be used for static file serving, so a css file in this module's public folder would be found at public/demo/styles.css
    }
}